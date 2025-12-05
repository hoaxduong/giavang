import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const zoneMappingSchema = z.object({
  sourceId: z.string().uuid(),
  zoneText: z.string().min(1).max(100),
  provinceCode: z.string().min(1).max(50),
  isEnabled: z.boolean().optional().default(true),
});

/**
 * GET /api/admin/crawler/zone-mappings
 * List all zone mappings (with optional source filter)
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    let query = supabase
      .from("zone_mappings")
      .select("*")
      .order("created_at", { ascending: false });

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ zoneMappings: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/crawler/zone-mappings
 * Create a new zone mapping
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = zoneMappingSchema.parse(body);

    // Verify province exists
    const { data: province, error: provinceError } = await supabase
      .from("provinces")
      .select("code")
      .eq("code", validated.provinceCode)
      .single();

    if (provinceError || !province) {
      return NextResponse.json(
        { error: `Province ${validated.provinceCode} not found` },
        { status: 400 }
      );
    }

    // Verify source exists
    const { data: source, error: sourceError } = await supabase
      .from("crawler_sources")
      .select("id")
      .eq("id", validated.sourceId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: "Crawler source not found" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("zone_mappings")
      .insert({
        source_id: validated.sourceId,
        zone_text: validated.zoneText,
        province_code: validated.provinceCode,
        is_enabled: validated.isEnabled,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Zone mapping already exists for this source" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ zoneMapping: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    if ((error as any).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
