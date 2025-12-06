import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1).max(100),
  apiUrl: z.string().url(),
  apiType: z.string().min(1).max(50),
  isEnabled: z.boolean().optional().default(true),
  headers: z.record(z.string()).optional(),
  authType: z.string().optional(),
  authConfig: z.record(z.unknown()).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional().default(60),
  timeoutSeconds: z.number().int().min(1).max(300).optional().default(30),
  priority: z.number().int().min(1).max(100).optional().default(1),
});

/**
 * GET /api/admin/crawler/sources
 * List all crawler sources
 */
export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("crawler_sources")
      .select("*")
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ sources: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/crawler/sources
 * Create a new crawler source
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = sourceSchema.parse(body);

    const { data, error } = await supabase
      .from("crawler_sources")
      .insert({
        name: validated.name,
        api_url: validated.apiUrl,
        api_type: validated.apiType,
        is_enabled: validated.isEnabled,
        headers: validated.headers || {},
        auth_type: validated.authType,
        auth_config: validated.authConfig,
        rate_limit_per_minute: validated.rateLimitPerMinute,
        timeout_seconds: validated.timeoutSeconds,
        priority: validated.priority,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ source: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 }
    );
  }
}
