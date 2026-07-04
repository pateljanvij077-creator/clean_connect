import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export default function HomeOwnerRoute() {
  const [loading, setLoading] = useState(true)
  const [isHO, setIsHO] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('users')
        .select('roles(name)')
        .eq('id', user.id)
        .single()

      // Admin also passes through to allow full access
      setIsHO(['homeowner', 'admin'].includes(data?.roles?.name))
      setLoading(false)
    }
    checkRole()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  )

  return isHO ? <Outlet /> : <Navigate to="/auth" replace />
}
