import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireRole("admin");
    const supabase = await createClient();

    // Get user count
    const { count: userCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Get admin count
    const { count: adminCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    // Get price snapshots count
    const { count: priceCount } = await supabase
      .from("price_snapshots")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      totalUsers: userCount || 0,
      totalAdmins: adminCount || 0,
      totalPriceSnapshots: priceCount || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
