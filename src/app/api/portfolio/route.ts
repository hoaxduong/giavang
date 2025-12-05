import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import type { PortfolioEntry } from "@/lib/types";

/**
 * Get price at a specific timestamp
 * Finds the closest price snapshot before or at the given timestamp
 */
async function getPriceAtTimestamp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  retailer: string,
  productName: string,
  province: string | null,
  timestamp: string
): Promise<{ buyPrice: number; sellPrice: number } | null> {
  let query = supabase
    .from("price_snapshots")
    .select("buy_price, sell_price")
    .eq("retailer", retailer)
    .eq("product_name", productName)
    .lte("created_at", timestamp)
    .order("created_at", { ascending: false })
    .limit(1);

  if (province) {
    query = query.eq("province", province);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    // Fallback: try without province filter
    if (province) {
      const fallbackQuery = supabase
        .from("price_snapshots")
        .select("buy_price, sell_price")
        .eq("retailer", retailer)
        .eq("product_name", productName)
        .lte("created_at", timestamp)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: fallbackData } = await fallbackQuery;

      if (fallbackData && fallbackData.length > 0) {
        return {
          buyPrice: Number(fallbackData[0].buy_price),
          sellPrice: Number(fallbackData[0].sell_price),
        };
      }
    }
    return null;
  }

  return {
    buyPrice: Number(data[0].buy_price),
    sellPrice: Number(data[0].sell_price),
  };
}

/**
 * Portfolio API Route
 *
 * GET: Fetch all portfolio entries for authenticated user
 * POST: Create new portfolio entry
 * PUT: Update portfolio entry (mark as sold, edit details)
 * DELETE: Delete portfolio entry
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_portfolio")
      .select("*, productName:product_type")
      .eq("user_id", user.id)
      .order("bought_at", { ascending: false });

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    return NextResponse.json({
      data: data as PortfolioEntry[],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Failed to fetch portfolio:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to fetch portfolio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const { amount, retailer, productName, province, bought_at } = body;

    // Validate required fields
    if (!amount || !retailer || !productName || !bought_at) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["amount", "retailer", "productName", "bought_at"],
        },
        { status: 400 }
      );
    }

    // Get price at purchase time
    const priceAtTime = await getPriceAtTimestamp(
      supabase,
      retailer,
      productName,
      province || null,
      bought_at
    );

    if (!priceAtTime) {
      return NextResponse.json(
        {
          error:
            "Could not find price data for the specified time and gold type",
        },
        { status: 400 }
      );
    }

    // Insert portfolio entry
    // When user buys gold, they pay the retailer's sell_price
    const { data, error } = await supabase
      .from("user_portfolio")
      .insert({
        user_id: user.id,
        amount: Number(amount),
        retailer,
        product_type: productName,
        province: province || null,
        bought_at,
        buy_price: priceAtTime.sellPrice, // User pays retailer's sell price when buying
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      throw error;
    }

    return NextResponse.json({
      data: data as PortfolioEntry,
    });
  } catch (error) {
    console.error("Failed to create portfolio entry:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to create portfolio entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const { id, sold_at, amount, retailer, productName, province, bought_at } =
      body;

    if (!id) {
      return NextResponse.json(
        {
          error: "Missing required field: id",
        },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("user_portfolio")
      .select("*, productName:product_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        {
          error: "Portfolio entry not found",
        },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // If marking as sold, get buy price at sold_at time
    // When user sells gold, they receive the retailer's buy_price
    if (sold_at && !existing.sold_at) {
      const priceAtTime = await getPriceAtTimestamp(
        supabase,
        existing.retailer,
        existing.productName,
        existing.province,
        sold_at
      );

      if (!priceAtTime) {
        return NextResponse.json(
          {
            error: "Could not find price data for the specified sold time",
          },
          { status: 400 }
        );
      }

      updateData.sold_at = sold_at;
      updateData.sell_price = priceAtTime.buyPrice; // User receives retailer's buy price when selling
    }

    // Update other fields if provided
    if (amount !== undefined) updateData.amount = Number(amount);
    if (retailer !== undefined) updateData.retailer = retailer;
    if (productName !== undefined) updateData.product_type = productName;
    if (province !== undefined) updateData.province = province || null;
    if (bought_at !== undefined) {
      updateData.bought_at = bought_at;
      // Recalculate buy_price if bought_at changed
      // When user buys gold, they pay the retailer's sell_price
      const newPrice = await getPriceAtTimestamp(
        supabase,
        updateData.retailer || existing.retailer,
        updateData.product_type || existing.productName,
        updateData.province !== undefined
          ? updateData.province
          : existing.province,
        bought_at
      );
      if (newPrice) {
        updateData.buy_price = newPrice.sellPrice; // User pays retailer's sell price when buying
      }
    }

    const { data, error } = await supabase
      .from("user_portfolio")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    return NextResponse.json({
      data: data as PortfolioEntry,
    });
  } catch (error) {
    console.error("Failed to update portfolio entry:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to update portfolio entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Missing required parameter: id",
        },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from("user_portfolio")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        {
          error: "Portfolio entry not found",
        },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("user_portfolio")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Database delete error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete portfolio entry:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to delete portfolio entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
