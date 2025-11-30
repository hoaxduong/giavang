export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email?: string
  profile?: UserProfile
}

