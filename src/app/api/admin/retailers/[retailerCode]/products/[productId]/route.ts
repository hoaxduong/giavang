import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { dbRetailerProductToRetailerProduct } from "@/lib/api/price-normalizer";
import { z } from "zod";

const updateProductSchema = z.object({
  productCode: z.string().min(1).max(100).optional(),
  productName: z.string().min(1).max(200).optional(),

  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

/**
 * GET /api/admin/retailers/[retailerCode]/products/[productId]
 * Get a specific product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailerCode: string; productId: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { retailerCode, productId } = await params;

    const { data, error } = await supabase
      .from("retailer_products")
      .select("*")
      .eq("id", productId)
      .eq("retailer_code", retailerCode)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      product: dbRetailerProductToRetailerProduct(data),
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PUT /api/admin/retailers/[retailerCode]/products/[productId]
 * Update a product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ retailerCode: string; productId: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { retailerCode, productId } = await params;

    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    const updateData: any = {};
    if (validated.productCode !== undefined) {
      updateData.product_code = validated.productCode;
    }
    if (validated.productName !== undefined) {
      updateData.product_name = validated.productName;
    }

    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }
    if (validated.sortOrder !== undefined) {
      updateData.sort_order = validated.sortOrder;
    }
    if (validated.isEnabled !== undefined) {
      updateData.is_enabled = validated.isEnabled;
    }
    if (validated.metadata !== undefined) {
      updateData.metadata = validated.metadata;
    }

    const { data, error } = await supabase
      .from("retailer_products")
      .update(updateData)
      .eq("id", productId)
      .eq("retailer_code", retailerCode)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Product code already exists for this retailer" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      product: dbRetailerProductToRetailerProduct(data),
    });
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
 * DELETE /api/admin/retailers/[retailerCode]/products/[productId]
 * Delete a product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ retailerCode: string; productId: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { retailerCode, productId } = await params;

    const { error } = await supabase
      .from("retailer_products")
      .delete()
      .eq("id", productId)
      .eq("retailer_code", retailerCode);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
