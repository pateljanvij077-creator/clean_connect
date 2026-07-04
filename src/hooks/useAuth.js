import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../store/authStore'
import { getUserProfile, getHomeownerProfileByUserId, getWorkerProfileByUserId } from '../services/auth'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const { 
    user, 
    session, 
    role, 
    homeowner, 
    worker,
    setUser, 
    setSession, 
    setRole, 
    setHomeowner, 
    setWorker,
    clearAuth 
  } = useAuthStore()

  useEffect(() => {
    async function loadSessionData(currentSession) {
      if (!currentSession?.user) {
        clearAuth()
        setLoading(false)
        return
      }

      setSession(currentSession)
      setUser(currentSession.user)

      try {
        const profile = await getUserProfile(currentSession.user.id)
        if (profile) {
          const userRole = profile.roles?.name
          setRole(userRole)

          if (userRole === 'homeowner') {
            const ho = await getHomeownerProfileByUserId(currentSession.user.id)
            setHomeowner(ho)
          } else if (userRole === 'worker') {
            const wr = await getWorkerProfileByUserId(currentSession.user.id)
            setWorker(wr)
          }
        }
      } catch (err) {
        console.error('Error loading session role/profile details:', err)
      } finally {
        setLoading(false)
      }
    }

    // Initialize current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionData(session)
    })

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true)
      if (session) {
        await loadSessionData(session)
      } else {
        clearAuth()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setRole, setHomeowner, setWorker, clearAuth])

  return {
    user,
    session,
    role,
    homeowner,
    worker,
    loading,
    isAdmin: role === 'admin',
    isWorker: role === 'worker',
    isHomeowner: role === 'homeowner',
    refreshProfile: async () => {
      if (!user) return
      const profile = await getUserProfile(user.id)
      if (profile) {
        setRole(profile.roles?.name)
        if (profile.roles?.name === 'homeowner') {
          const ho = await getHomeownerProfileByUserId(user.id)
          setHomeowner(ho)
        } else if (profile.roles?.name === 'worker') {
          const wr = await getWorkerProfileByUserId(user.id)
          setWorker(wr)
        }
      }
    }
  }
}
