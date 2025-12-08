import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
// Fetch all settings or a specific key
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", key)
        .single();

      if (error && error.code !== "PGRST116") throw error; // Ignore not found
      return NextResponse.json({ setting: data });
    } else {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return NextResponse.json({ settings: data });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings
// Update or Create a setting
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    // Parse body
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("system_settings")
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, setting: data });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
