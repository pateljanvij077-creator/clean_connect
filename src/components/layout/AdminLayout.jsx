import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Users, ShieldCheck, User, Settings, LogOut, Sun, Moon, MapPin, Sparkles, LayoutDashboard, CreditCard, MessageSquare, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../store/appStore'
import { signOut } from '../../services/auth'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { user } = useAuth()
  const { theme, toggleTheme } = useAppStore()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error(err)
    }
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Directory', path: '/admin/users', icon: Users },
    { label: 'Verified Workers', path: '/admin/workers', icon: ShieldCheck },
    { label: 'Home Owners', path: '/admin/homeowners', icon: User },
    { label: 'Payment Logs', path: '/admin/payments', icon: CreditCard },
    { label: 'Geo Locations', path: '/admin/locations', icon: MapPin },
    { label: 'User Complaints', path: '/admin/complaints', icon: MessageSquare },
    { label: 'Push Broadcast', path: '/admin/notifications', icon: Bell },
    { label: 'System Config', path: '/admin/settings', icon: Settings },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Admin Sidebar */}
      <aside className="glass" style={{
        width: '260px',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        borderRight: '1px solid var(--border-glass)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
          <div style={{
            background: 'var(--gradient-primary)',
            padding: '8px',
            borderRadius: '12px',
            display: 'flex',
            color: 'white'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>CleanConnect</h1>
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, letterSpacing: '0.1em' }}>SYS ADMIN</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = loc.pathname === item.path
            return (
              <Link 
                key={idx} 
                to={item.path}
                className="btn btn-ghost"
                style={{ 
                  justifyContent: 'flex-start',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={toggleTheme} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="glass" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 2rem',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Admin Session</h4>
              <span style={{ fontSize: '11px', color: '#ef4444' }}>Superuser privilege</span>
            </div>
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
