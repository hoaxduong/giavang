import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile, UserRole } from "./types";

/**
 * Get the current authenticated user (server-side)
 */
export async function getUser(): Promise<{
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile as UserProfile | null,
  };
}

/**
 * Require authentication - redirects to sign in if not authenticated
 */
export async function requireAuth(): Promise<{
  user: { id: string; email?: string };
  profile: UserProfile | null;
}> {
  const { user, profile } = await getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return { user, profile };
}

/**
 * Require a specific role - redirects to sign in or shows 403
 */
export async function requireRole(requiredRole: UserRole): Promise<{
  user: { id: string; email?: string };
  profile: UserProfile;
}> {
  const { user, profile } = await requireAuth();

  if (!profile) {
    redirect("/auth/signin");
  }

  if (requiredRole === "admin" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  if (
    requiredRole === "user" &&
    profile.role !== "user" &&
    profile.role !== "admin"
  ) {
    redirect("/auth/signin");
  }

  return { user, profile };
}

/**
 * Check if user is admin (server-side)
 */
export async function isAdmin(): Promise<boolean> {
  const { profile } = await getUser();
  return profile?.role === "admin";
}
