import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export default function AdminRoute() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('users')
        .select('roles(name)')
        .eq('id', user.id)
        .single()

      setIsAdmin(data?.roles?.name === 'admin')
      setLoading(false)
    }
    checkAdmin()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  )

  return isAdmin ? <Outlet /> : <Navigate to="/auth" replace />
}
