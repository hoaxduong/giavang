"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, UserProfile } from "@/lib/auth/types";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasSetInitialState = useRef(false);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();

      // Get user profile directly (no need for redundant getUser call)
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Profile might not exist yet, that's okay
        if (error.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("Error loading profile:", error);
        }
        return;
      }

      if (profile) {
        setProfile(profile as UserProfile);
        // Update user with profile
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            profile: profile as UserProfile,
          };
        });
      }
    } catch (err) {
      console.error("Unexpected error in loadUserProfile:", err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let sessionChecked = false;

    const handleSession = (session: Session | null) => {
      if (!isMounted || sessionChecked) return;

      sessionChecked = true;
      hasSetInitialState.current = true;

      setSession(session);
      if (session?.user) {
        // Set user immediately with email (non-blocking)
        const authUser = {
          id: session.user.id,
          email: session.user.email || undefined,
        };
        setUser(authUser);
        setLoading(false);

        // Load profile in background (non-blocking)
        loadUserProfile(session.user.id).catch((err) => {
          console.error("Error loading user profile:", err);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    // Listen for auth changes (fires immediately if session exists)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      handleSession(session);
    });

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;

        if (error) {
          console.error("Error getting session:", error);
          if (!sessionChecked) {
            sessionChecked = true;
            hasSetInitialState.current = true;
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        handleSession(session);
      })
      .catch((err) => {
        if (!isMounted || sessionChecked) return;

        sessionChecked = true;
        hasSetInitialState.current = true;
        console.error("Error in getSession:", err);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    // Fallback timeout: only set loading to false if session check hasn't completed after 3 seconds
    // This prevents hanging but gives enough time for the session check
    const timeoutId = setTimeout(() => {
      if (isMounted && !sessionChecked) {
        console.warn("Session check timed out, assuming not authenticated");
        setUser(null);
        setProfile(null);
        setLoading(false);
        hasSetInitialState.current = true;
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
  };
}
