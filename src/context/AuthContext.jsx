import { useEffect, useState, useCallback } from 'react'
import { supabase, getProfile, getMyVerification } from '../services/supabase'
import { AuthContext } from './auth-context'

// Solo consulta, no toca el estado
function fetchUserData(id) {
  return Promise.all([
    getProfile(id).catch(() => null),
    getMyVerification(id).catch(() => null),
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [checked, setChecked] = useState(false)
  const [data, setData]       = useState({ userId: null, profile: null, verification: null })

  const userId = user?.id

  // Sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      setUser(s.session?.user ?? null)
      setChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Perfil y verificación
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchUserData(userId).then(([profile, verification]) => {
      if (!cancelled) setData({ userId, profile, verification })
    })
    return () => { cancelled = true }
  }, [userId])

  const ready        = !userId || data.userId === userId
  const loading      = !checked || !ready
  const profile      = userId && ready ? data.profile : null
  const verification = userId && ready ? data.verification : null
  const displayName  = profile?.display_name || user?.email?.split('@')[0] || ''

  const refresh = useCallback(async () => {
    if (!userId) return
    const [profile, verification] = await fetchUserData(userId)
    setData({ userId, profile, verification })
  }, [userId])

  return (
    <AuthContext.Provider value={{ user, profile, verification, displayName, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}