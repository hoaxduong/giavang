import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { dbRetailerProductToRetailerProduct } from "@/lib/api/price-normalizer";
import { z } from "zod";

const productSchema = z.object({
  productCode: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),

  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isEnabled: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).nullable().optional(),
});

/**
 * GET /api/admin/retailers/[retailerCode]/products
 * List all products for a specific retailer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ retailerCode: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { retailerCode } = await params;

    // Verify retailer exists
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("code, name")
      .eq("code", retailerCode)
      .single();

    if (retailerError || !retailer) {
      return NextResponse.json(
        { error: "Retailer not found" },
        { status: 404 }
      );
    }

    // Get products for this retailer
    const { data, error } = await supabase
      .from("retailer_products")
      .select("*")
      .eq("retailer_code", retailerCode)
      .order("sort_order", { ascending: true })
      .order("product_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const products = data.map(dbRetailerProductToRetailerProduct);

    return NextResponse.json({
      retailer: {
        code: retailer.code,
        name: retailer.name,
      },
      products,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/retailers/[retailerCode]/products
 * Create a new product for a retailer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ retailerCode: string }> }
) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { retailerCode } = await params;

    const body = await request.json();
    const validated = productSchema.parse(body);

    // Verify retailer exists
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("code")
      .eq("code", retailerCode)
      .single();

    if (retailerError || !retailer) {
      return NextResponse.json(
        { error: "Retailer not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("retailer_products")
      .insert({
        retailer_code: retailerCode,
        product_code: validated.productCode,
        product_name: validated.productName,

        description: validated.description,
        sort_order: validated.sortOrder,
        is_enabled: validated.isEnabled,
        metadata: validated.metadata,
      })
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

    return NextResponse.json(
      { product: dbRetailerProductToRetailerProduct(data) },
      { status: 201 }
    );
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
