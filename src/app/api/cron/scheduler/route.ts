import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { runAutomation } from "@/lib/automation/executor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  console.log("Scheduler starting...");

  // 1. Fetch active automations
  const { data: automations, error } = await supabase
    .from("automations")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch automations", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!automations || automations.length === 0) {
    console.log("No active automations found");
    return NextResponse.json({ ran: 0, message: "No active automations" });
  }

  const now = new Date();
  // Vercel Cron runs in UTC usually. We need to handle timezone if user inputs local time.
  // For now, assuming user inputs UTC hours in cron.
  // Or we stick to simple logic: "0 8 * * *" matches if current UTC hour is 8.

  const currentHour = now.getUTCHours();

  let ranCount = 0;

  for (const auto of automations) {
    // Parse schedule (Simplified: assumes "m H * * *" format)
    // We only support simple hourly/daily schedules for now without a parser library.
    const parts = auto.schedule.trim().split(/\s+/);
    if (parts.length < 5) {
      console.warn(
        `Invalid schedule format for ${auto.name}: ${auto.schedule}`
      );
      continue;
    }

    const cronHour = parts[1];

    // Check if should run
    let shouldRun = false;

    if (cronHour === "*") {
      // Runs every hour
      shouldRun = true;
    } else {
      // Handle "8" or "08"
      const h = parseInt(cronHour);
      if (!isNaN(h) && h === currentHour) {
        shouldRun = true;
      }
    }

    // Check last run to avoid duplicates in the same window
    if (shouldRun && auto.last_run_at) {
      const lastRun = new Date(auto.last_run_at);
      // If last run was less than 50 mins ago, skip
      const diff = now.getTime() - lastRun.getTime();
      if (diff < 50 * 60 * 1000) {
        // Already ran this hour
        shouldRun = false;
      }
    }

    if (shouldRun) {
      try {
        console.log(`Running automation ${auto.name} (${auto.id})`);
        await runAutomation(auto.id, supabase);
        ranCount++;
      } catch (e) {
        console.error(`Failed to run automation ${auto.name}`, e);
        // Log failure to DB? runAutomation logs success, but we should log failure here?
        // runAutomation throws on error, so we catch it here.
        await supabase.from("automation_logs").insert({
          type: auto.type,
          status: "error",
          message: `Scheduler failed: ${e instanceof Error ? e.message : "Unknown"}`,
          meta: { automationId: auto.id },
        });
      }
    }
  }

  console.log(`Scheduler finished. Ran ${ranCount} automations.`);
  return NextResponse.json({ ran: ranCount });
}
