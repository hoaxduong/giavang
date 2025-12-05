import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retailer Products API Route
 *
 * Fetches retailer products
 *
 * Optional query parameters:
 * - retailer: Filter by specific retailer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const retailer = searchParams.get("retailer");

    const supabase = await createClient();

    let query = supabase
      .from("retailer_products")
      .select("id, retailer_code, product_name")
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true })
      .order("product_name", { ascending: true });

    if (retailer) {
      query = query.eq("retailer_code", retailer);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    // Map to camelCase for frontend
    const mappedData = (data || []).map((item) => ({
      id: item.id,
      retailerCode: item.retailer_code,
      productName: item.product_name,
    }));

    return NextResponse.json({
      data: mappedData,
      count: mappedData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch retailer products:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch retailer products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
