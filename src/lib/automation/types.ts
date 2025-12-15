import { SupabaseClient } from "@supabase/supabase-js";

export interface AutomationConfig {
  targetCategoryId?: string;
  targetTagIds?: string[];
  postMode?: "update" | "create";
  [key: string]: any;
}

export interface Automation {
  id: string;
  name: string;
  type: string;
  schedule: string;
  is_active: boolean;
  prompt_template?: string;
  config: AutomationConfig;
  last_run_at?: string;
  next_run_at?: string;
}

export interface AutomationContext {
  supabase: SupabaseClient;
  automation: Automation;
  user?: any;
  aiConfig?: any;
}

export interface AutomationResult {
  success: boolean;
  data?: any;
  meta?: any; // For logging
}

export interface AutomationHandler {
  execute(context: AutomationContext): Promise<AutomationResult>;
}
