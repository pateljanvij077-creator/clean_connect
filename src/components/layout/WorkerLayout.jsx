import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, ClipboardList, Briefcase, Bell, User, Settings, LogOut, Sun, Moon, Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../store/appStore'
import { getUnreadNotificationCount, subscribeToNotifications } from '../../services/notifications'
import { updateWorkerAvailability } from '../../services/workers'
import { signOut } from '../../services/auth'
import { toast } from 'react-hot-toast'

export default function WorkerLayout({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { worker, user, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useAppStore()
  const [unread, setUnread] = useState(0)
  const [isAvailable, setIsAvailable] = useState(worker?.is_available || false)

  useEffect(() => {
    if (worker) {
      setIsAvailable(worker.is_available)
    }
  }, [worker])

  useEffect(() => {
    if (!user) return

    getUnreadNotificationCount(user.id).then(setUnread)

    const channel = subscribeToNotifications(user.id, () => {
      setUnread((prev) => prev + 1)
    })

    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error(err)
    }
  }

  const handleAvailabilityToggle = async () => {
    if (!worker) return
    const nextVal = !isAvailable
    try {
      await updateWorkerAvailability(worker.id, {
        isAvailable: nextVal,
        status: nextVal ? 'available' : 'offline'
      })
      setIsAvailable(nextVal)
      toast.success(nextVal ? 'You are now online & visible!' : 'You are offline')
      await refreshProfile()
    } catch (err) {
      toast.error('Failed to update availability')
    }
  }

  const navItems = [
    { label: 'Dashboard', path: '/worker/dashboard', icon: Home },
    { label: 'Booking Requests', path: '/worker/requests', icon: ClipboardList },
    { label: 'Upcoming Jobs', path: '/worker/upcoming', icon: Briefcase },
    { label: 'Notifications', path: '/worker/notifications', icon: Bell, badge: unread },
    { label: 'Subscriptions', path: '/worker/subscription', icon: Settings },
    { label: 'My Profile', path: '/worker/profile', icon: User },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar for Desktop */}
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
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em' }}>WORKER PRO</span>
          </div>
        </div>

        {/* Availability Quick Switch */}
        <div className="card glass" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Duty Status</span>
            <span className={`badge ${isAvailable ? 'badge-verified' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
              {isAvailable ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <button 
            onClick={handleAvailabilityToggle} 
            className={`btn btn-sm ${isAvailable ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%' }}
          >
            {isAvailable ? 'Go Offline' : 'Go Online'}
          </button>
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
                  position: 'relative'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.badge}
                  </span>
                )}
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
        {/* Top Navbar */}
        <header className="glass" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          <div>
            {worker?.verification_status !== 'approved' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '13px', fontWeight: 600 }}>
                <AlertCircle size={16} />
                <span>Profile Under Verification Review</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{worker?.full_name}</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{worker?.worker_type?.replace('_', ' ')}</span>
            </div>
            {worker?.avatar_url ? (
              <img src={worker.avatar_url} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="var(--primary)" />
              </div>
            )}
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
