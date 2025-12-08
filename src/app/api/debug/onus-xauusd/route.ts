import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Debug endpoint to check Onus API response and type mappings
 * GET /api/debug/onus-xauusd
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // 1. Check if type mapping exists
    const { data: mappings, error: mappingError } = await supabase
      .from("crawler_type_mappings")
      .select("*")
      .ilike("external_code", "%xau%");

    // 2. Check if empty retailer exists
    const { data: retailers, error: retailerError } = await supabase
      .from("retailers")
      .select("*")
      .eq("code", "");

    // 3. Check if XAUUSD product exists
    const { data: products, error: productError } = await supabase
      .from("retailer_products")
      .select("*")
      .eq("retailer_code", "");

    // 4. Fetch from Onus API to see actual data
    const onusResponse = await fetch("https://api.onus.pro/api/golds");
    const onusData = await onusResponse.json();

    // Find XAU items
    const xauItems = onusData.data?.filter(
      (item: any) =>
        item.slug?.toLowerCase().includes("xau") ||
        item.type?.toLowerCase().includes("xau")
    );

    return NextResponse.json({
      mappings: {
        data: mappings,
        error: mappingError,
      },
      retailers: {
        data: retailers,
        error: retailerError,
      },
      products: {
        data: products,
        error: productError,
      },
      onusApi: {
        xauItems,
        totalItems: onusData.data?.length,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Failed to debug",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
