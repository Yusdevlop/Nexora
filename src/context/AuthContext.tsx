import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { clearCache } from '../lib/cache'

interface Profile {
  display_name: string
}

interface AuthValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  displayName: string
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirm: boolean }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateName: (name: string) => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth AuthProvider daxilində istifadə olunmalıdır')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile({ display_name: data.display_name as string })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin }
    })
    if (error) throw error
    return { needsConfirm: !data.session }
  }, [])

  // Gələcəkdə Google girişi: Supabase-də Google provider-i aktiv edib
  // .env-də VITE_ENABLE_GOOGLE_LOGIN=true yazmaq kifayətdir (README-yə baxın).
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearCache()
    setProfile(null)
  }, [])

  const updateName = useCallback(
    async (name: string) => {
      if (!userId) return
      const clean = name.trim()
      const { error } = await supabase.from('profiles').update({ display_name: clean }).eq('id', userId)
      if (error) throw error
      await supabase.auth.updateUser({ data: { display_name: clean } })
      setProfile({ display_name: clean })
    },
    [userId]
  )

  const value = useMemo<AuthValue>(() => {
    const user = session?.user ?? null
    const fallback = user?.email?.split('@')[0] ?? ''
    return {
      session,
      user,
      profile,
      displayName: profile?.display_name || (user?.user_metadata?.display_name as string | undefined) || fallback,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateName
    }
  }, [session, profile, loading, signIn, signUp, signInWithGoogle, signOut, updateName])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
