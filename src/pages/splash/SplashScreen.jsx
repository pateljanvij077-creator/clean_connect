import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../supabase/client'
import { getUserProfile } from '../../services/auth'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    async function checkSession() {
      // Delay slightly for presentation
      await new Promise(r => setTimeout(r, 1500))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/auth')
        return
      }

      try {
        const profile = await getUserProfile(session.user.id)
        if (profile?.roles?.name === 'admin') {
          navigate('/admin/dashboard')
        } else if (profile?.roles?.name === 'worker') {
          navigate('/worker/dashboard')
        } else if (profile?.roles?.name === 'homeowner') {
          navigate('/homeowner/dashboard')
        } else {
          navigate('/auth/select-role')
        }
      } catch (err) {
        console.error('Error verifying user role:', err)
        navigate('/auth')
      }
    }

    checkSession()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      gap: '1.5rem'
    }}>
      <div 
        className="slide-up"
        style={{
          background: 'var(--gradient-primary)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          color: 'white',
          boxShadow: '0 8px 32px 0 var(--primary-glow)',
          marginBottom: '0.5rem'
        }}
      >
        <Sparkles size={48} />
      </div>

      <h1 
        className="fade-in"
        style={{ 
          fontSize: '2.5rem', 
          fontWeight: 900, 
          background: 'var(--gradient-primary)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}
      >
        CleanConnect
      </h1>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
        Find verified cleaning professionals near you
      </p>

      <div className="spinner" style={{ marginTop: '1rem', width: '32px', height: '32px' }} />
    </div>
  )
}
