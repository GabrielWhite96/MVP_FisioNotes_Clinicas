import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/shared/api/supabase'
import { queryKeys } from '@/shared/api/query-keys'
import { getProfile } from '../api/auth-api'
import { capturePasswordRecoveryFromUrl, markPasswordRecovery } from '../lib/password-recovery'
import type { Profile } from '@/shared/types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | undefined
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    capturePasswordRecoveryFromUrl()

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') markPasswordRecovery()
      setSession(newSession)
      queryClient.invalidateQueries({ queryKey: queryKeys.session })
      if (newSession?.user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(newSession.user.id) })
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(session?.user?.id ?? ''),
    queryFn: () => getProfile(session!.user.id),
    enabled: !!session?.user?.id,
  })

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profileQuery.data as Profile | undefined,
    isLoading: initializing || (!!session && profileQuery.isLoading),
    isAuthenticated: !!session,
  }), [session, initializing, profileQuery.data, profileQuery.isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = use(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}
