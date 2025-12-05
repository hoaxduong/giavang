import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateZoneMappingSchema = z.object({
  zoneText: z.string().min(1).max(100).optional(),
  provinceCode: z.string().min(1).max(50).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * GET /api/admin/crawler/zone-mappings/[id]
 * Get a specific zone mapping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("zone_mappings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ zoneMapping: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PUT /api/admin/crawler/zone-mappings/[id]
 * Update a zone mapping
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const body = await request.json();
    const validated = updateZoneMappingSchema.parse(body);

    // If provinceCode is being updated, verify it exists
    if (validated.provinceCode) {
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
    }

    const updateData: any = {};
    if (validated.zoneText !== undefined) {
      updateData.zone_text = validated.zoneText;
    }
    if (validated.provinceCode !== undefined) {
      updateData.province_code = validated.provinceCode;
    }
    if (validated.isEnabled !== undefined) {
      updateData.is_enabled = validated.isEnabled;
    }

    const { data, error } = await supabase
      .from("zone_mappings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Zone mapping with this text already exists for this source" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ zoneMapping: data });
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

/**
 * DELETE /api/admin/crawler/zone-mappings/[id]
 * Delete a zone mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from("zone_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
