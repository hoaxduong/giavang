import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "./types";

/**
 * Get the current user's profile from the database
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return profile as UserProfile;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
) {
  const supabase = createClient();
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
      },
    },
  });
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: "google" | "github") {
  const supabase = createClient();
  const origin = window.location.origin;

  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  return await supabase.auth.signOut();
}
