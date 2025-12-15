import { SupabaseClient } from "@supabase/supabase-js";
import { getAutomationHandler } from "./registry";

export async function runAutomation(
  automationId: string,
  supabase: SupabaseClient,
  user?: any
) {
  // 1. Fetch automation
  const { data: automation, error: autoError } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (autoError || !automation) {
    throw new Error("Automation not found");
  }

  // 2. Fetch AI Config
  const { data: settings } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "ai_config")
    .single();
  const aiConfig = settings?.value;

  // 3. Get Handler & Execute
  const handler = getAutomationHandler(automation.type);

  const result = await handler.execute({
    supabase,
    automation,
    user,
    aiConfig,
  });

  // 4. Log
  await supabase.from("automation_logs").insert({
    type: automation.type,
    status: "success",
    message: `Automation '${automation.name}' executed successfully.`,
    meta: {
      ...result.meta,
      automationId: automation.id,
      triggeredBy: user?.id || "system",
    },
  });

  // 5. Update Last Run
  await supabase
    .from("automations")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", automationId);

  return result;
}
