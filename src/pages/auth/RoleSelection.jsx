import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Briefcase, Sparkles, ChevronRight } from 'lucide-react'

export default function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div 
        className="card glass slide-up" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'var(--gradient-primary)',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex',
            color: 'white'
          }}>
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Select Account Type</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Choose how you would like to use CleanConnect
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {/* Homeowner Card */}
          <div 
            className="card glass-hover"
            onClick={() => navigate('/auth/homeowner-signup')}
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all var(--transition-md)'
            }}
          >
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Home size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>I am a Home Owner</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                I want to find, connect with, and book verified cleaners in my area
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>

          {/* Worker Card */}
          <div 
            className="card glass-hover"
            onClick={() => navigate('/auth/worker-signup')}
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all var(--transition-md)'
            }}
          >
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Briefcase size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>I am a Cleaner / Worker</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                I offer cleaning services and want to receive job bookings
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/auth') }} style={{ fontWeight: 600 }}>Login here</a>
        </div>
      </div>
    </div>
  )
}
