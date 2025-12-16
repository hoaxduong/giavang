import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { runAutomation } from "@/lib/automation/executor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check: Ensure user is admin
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get("automationId");

    if (automationId) {
      const result = await runAutomation(automationId, supabase, user);
      return NextResponse.json({
        ...result,
        generatedStyle: result.meta?.style,
      });
    }

    // Legacy Fallback: Find the FIRST active 'gold_price_post' automation
    const { data: defaultAuto } = await supabase
      .from("automations")
      .select("id")
      .eq("type", "gold_price_post")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (defaultAuto) {
      const result = await runAutomation(defaultAuto.id, supabase, user);
      return NextResponse.json({
        ...result,
        generatedStyle: result.meta?.style,
      });
    }

    // If absolutely no automation found, we could fall back to old hardcoded logic,
    // but better to tell user to Config one.
    return NextResponse.json(
      { error: "No automation configured. Please create one first." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Manual generation failed:", error);

    // Attempt to log error
    try {
      const supabase = await createClient();
      await supabase.from("automation_logs").insert({
        type: "gold_price_post",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        meta: {
          manual: true,
          error:
            error instanceof Error ? error.message : "Unknown error object",
        },
      });
    } catch (_e) {
      /* ignore log error */
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(_request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data, error } = await supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
