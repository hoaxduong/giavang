import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const mappingSchema = z.object({
  sourceId: z.string().uuid(),
  externalCode: z.string().min(1).max(100),
  retailerCode: z.string().min(1).max(50),
  productTypeCode: z.string().min(1).max(50),
  provinceCode: z.string().min(1).max(50).nullable().optional(),
  label: z.string().min(1).max(200),
  isEnabled: z.boolean().optional().default(true),
});

const updateMappingSchema = z.object({
  id: z.string().uuid(),
  externalCode: z.string().min(1).max(100).optional(),
  retailerCode: z.string().min(1).max(50).optional(),
  productTypeCode: z.string().min(1).max(50).optional(),
  provinceCode: z.string().min(1).max(50).nullable().optional(),
  label: z.string().min(1).max(200).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * GET /api/admin/crawler/mappings
 * List all type mappings (with optional source filter)
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("source_id");

    let query = supabase
      .from("crawler_type_mappings")
      .select("*")
      .order("created_at", { ascending: false });

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ mappings: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/crawler/mappings
 * Create a new type mapping
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = mappingSchema.parse(body);

    const { data, error } = await supabase
      .from("crawler_type_mappings")
      .insert({
        source_id: validated.sourceId,
        external_code: validated.externalCode,
        retailer_code: validated.retailerCode,
        product_type_code: validated.productTypeCode,
        province_code: validated.provinceCode,
        label: validated.label,
        is_enabled: validated.isEnabled,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ mapping: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 },
    );
  }
}

/**
 * PUT /api/admin/crawler/mappings
 * Update a type mapping
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateMappingSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.externalCode !== undefined)
      updateData.external_code = validated.externalCode;
    if (validated.retailerCode !== undefined)
      updateData.retailer_code = validated.retailerCode;
    if (validated.productTypeCode !== undefined)
      updateData.product_type_code = validated.productTypeCode;
    if (validated.provinceCode !== undefined)
      updateData.province_code = validated.provinceCode;
    if (validated.label !== undefined) updateData.label = validated.label;
    if (validated.isEnabled !== undefined)
      updateData.is_enabled = validated.isEnabled;

    const { data, error } = await supabase
      .from("crawler_type_mappings")
      .update(updateData)
      .eq("id", validated.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ mapping: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 },
    );
  }
}

/**
 * DELETE /api/admin/crawler/mappings
 * Delete a type mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("crawler_type_mappings")
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
