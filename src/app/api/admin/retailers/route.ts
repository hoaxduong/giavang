import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const retailerSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  isEnabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

const updateRetailerSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/retailers
 * List all retailers
 */
export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ retailers: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/retailers
 * Create a new retailer
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = retailerSchema.parse(body);

    const { data, error } = await supabase
      .from("retailers")
      .insert({
        code: validated.code,
        name: validated.name,
        is_enabled: validated.isEnabled,
        sort_order: validated.sortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ retailer: data }, { status: 201 });
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
 * PUT /api/admin/retailers
 * Update a retailer
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateRetailerSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.code !== undefined) updateData.code = validated.code;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.isEnabled !== undefined)
      updateData.is_enabled = validated.isEnabled;
    if (validated.sortOrder !== undefined)
      updateData.sort_order = validated.sortOrder;

    const { data, error } = await supabase
      .from("retailers")
      .update(updateData)
      .eq("id", validated.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ retailer: data });
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
 * DELETE /api/admin/retailers
 * Delete a retailer
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

    const { error } = await supabase.from("retailers").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
