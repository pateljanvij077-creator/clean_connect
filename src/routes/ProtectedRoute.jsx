import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary)'
      }}>
        <div className="spinner" />
      </div>
    )
  }

  return session ? <Outlet /> : <Navigate to="/auth" replace />
}
