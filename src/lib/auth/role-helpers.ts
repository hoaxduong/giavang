import type { UserRole } from './types'

/**
 * Check if a role has admin privileges
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Check if a role has at least user privileges
 */
export function isUser(role: UserRole | null | undefined): boolean {
  return role === 'user' || role === 'admin'
}

/**
 * Check if user has required role
 */
export function hasRole(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false

  if (requiredRole === 'admin') {
    return userRole === 'admin'
  }

  // For 'user' role, both 'user' and 'admin' are allowed
  return userRole === 'user' || userRole === 'admin'
}

