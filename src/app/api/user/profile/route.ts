import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireAuth();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await requireAuth();
    const body = await request.json();

    // Users can only update their own profile (except role)
    const supabase = await createClient();
    const updates: { full_name?: string | null; avatar_url?: string | null } =
      {};

    if (body.full_name !== undefined) {
      updates.full_name = body.full_name || null;
    }
    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url || null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
