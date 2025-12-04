import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireRole } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireRole("admin");
    const supabase = await createClient();
    const serviceRoleClient = createServiceRoleClient();

    // Get all users with their profiles
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get emails from auth.users using service role
    const usersWithEmail = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser, error: authError } =
            await serviceRoleClient.auth.admin.getUserById(profile.id);
          return {
            ...profile,
            email: authUser?.user?.email || null,
          };
        } catch {
          return {
            ...profile,
            email: null,
          };
        }
      }),
    );

    return NextResponse.json({ users: usersWithEmail });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await requireRole("admin");
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role || !["user", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Prevent users from changing their own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", userId)
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
