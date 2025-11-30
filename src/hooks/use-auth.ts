'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, UserProfile } from '@/lib/auth/types'
import type { Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }
      
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user.id).catch((err) => {
          console.error('Error loading user profile:', err)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch((err) => {
      console.error('Error in getSession:', err)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        try {
          await loadUserProfile(session.user.id)
        } catch (err) {
          console.error('Error loading user profile in auth change:', err)
          setLoading(false)
        }
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      const supabase = createClient()
      
      // Get auth user first
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('Error getting auth user:', authError)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      // Get user profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        // Even if profile doesn't exist, we can still show the user with just email
        setUser({
          id: authUser.id,
          email: authUser.email,
        })
        setProfile(null)
        setLoading(false)
        return
      }

      if (!profile) {
        setUser({
          id: authUser.id,
          email: authUser.email,
        })
        setProfile(null)
        setLoading(false)
        return
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        profile: profile as UserProfile,
      })
      setProfile(profile as UserProfile)
      setLoading(false)
    } catch (err) {
      console.error('Unexpected error in loadUserProfile:', err)
      setLoading(false)
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
  }
}

