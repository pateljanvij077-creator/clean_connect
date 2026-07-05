import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../store/authStore'
import { getUserProfile, getHomeownerProfileByUserId, getWorkerProfileByUserId } from '../services/auth'

export function useAuth() {
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

  // Determine if we need to perform an initial load.
  // We need to load if the user is present but their role-specific profile hasn't been loaded.
  // For admins, we try to load both profiles if they exist, so if either is null, we might check.
  const needsLoading = !user || (role === 'homeowner' && !homeowner) || (role === 'worker' && !worker) || (role === 'admin' && !homeowner && !worker)
  const [loading, setLoading] = useState(needsLoading)

  useEffect(() => {
    let active = true

    async function loadSessionData(currentSession) {
      if (!currentSession?.user) {
        if (active) {
          clearAuth()
          setLoading(false)
        }
        return
      }

      if (active) {
        setSession(currentSession)
        setUser(currentSession.user)
      }

      try {
        const profile = await getUserProfile(currentSession.user.id)
        if (!active) return

        if (profile) {
          const userRole = profile.roles?.name
          if (active) setRole(userRole)

          // Fetch whatever profiles exist for this user (including admin testing flows)
          const ho = await getHomeownerProfileByUserId(currentSession.user.id)
          if (active && ho) setHomeowner(ho)

          const wr = await getWorkerProfileByUserId(currentSession.user.id)
          if (active && wr) setWorker(wr)
        }
      } catch (err) {
        console.error('Error loading session role/profile details:', err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    // Only run if we actually need to load, or to establish the auth state listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        loadSessionData(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      
      // If we are signed out or session is cleared
      if (!session) {
        clearAuth()
        setLoading(false)
        return
      }

      // Read current state from the store directly to avoid dependency updates
      const currentState = useAuthStore.getState()
      const currentNeedsLoading = !currentState.user || 
        (currentState.role === 'homeowner' && !currentState.homeowner) || 
        (currentState.role === 'worker' && !currentState.worker) || 
        (currentState.role === 'admin' && !currentState.homeowner && !currentState.worker)

      // If we already have the session user loaded, we don't need to trigger loading again on minor events
      if (currentState.user?.id === session.user.id && !currentNeedsLoading) {
        setSession(session)
        setLoading(false)
        return
      }

      setLoading(true)
      await loadSessionData(session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
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
        // Fetch and update homeowner profile if exists
        const ho = await getHomeownerProfileByUserId(user.id)
        if (ho) setHomeowner(ho)
        
        // Fetch and update worker profile if exists
        const wr = await getWorkerProfileByUserId(user.id)
        if (wr) setWorker(wr)
      }
    }
  }
}
