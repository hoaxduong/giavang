"use client";

import { useAuth } from "./use-auth";
import { isAdmin, hasRole } from "@/lib/auth/role-helpers";
import type { UserRole } from "@/lib/auth/types";

/**
 * Hook to check user role
 */
export function useRole() {
  const { profile } = useAuth();

  return {
    role: profile?.role || null,
    isAdmin: isAdmin(profile?.role),
    isUser: !!profile,
    hasRole: (requiredRole: UserRole) => hasRole(profile?.role, requiredRole),
  };
}
