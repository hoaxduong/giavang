import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apiUrl: z.string().url().optional(),
  apiType: z.string().min(1).max(50).optional(),
  isEnabled: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authType: z.string().optional(),
  authConfig: z.record(z.string(), z.unknown()).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
  timeoutSeconds: z.number().int().min(1).max(300).optional(),
  priority: z.number().int().min(1).max(100).optional(),
});

/**
 * GET /api/admin/crawler/sources/[id]
 * Get a single crawler source
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("crawler_sources")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ source: data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PUT /api/admin/crawler/sources/[id]
 * Update a crawler source
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateSourceSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.apiUrl !== undefined) updateData.api_url = validated.apiUrl;
    if (validated.apiType !== undefined)
      updateData.api_type = validated.apiType;
    if (validated.isEnabled !== undefined)
      updateData.is_enabled = validated.isEnabled;
    if (validated.headers !== undefined) updateData.headers = validated.headers;
    if (validated.authType !== undefined)
      updateData.auth_type = validated.authType;
    if (validated.authConfig !== undefined)
      updateData.auth_config = validated.authConfig;
    if (validated.rateLimitPerMinute !== undefined)
      updateData.rate_limit_per_minute = validated.rateLimitPerMinute;
    if (validated.timeoutSeconds !== undefined)
      updateData.timeout_seconds = validated.timeoutSeconds;
    if (validated.priority !== undefined)
      updateData.priority = validated.priority;

    const { data, error } = await supabase
      .from("crawler_sources")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ source: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/admin/crawler/sources/[id]
 * Delete a crawler source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { error } = await supabase
      .from("crawler_sources")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
