import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notifications'
import { formatDate } from '../../utils/helpers'
import { Bell, BellOff, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

function NotificationsContent() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getUserNotifications(user.id)
        .then(setNotifications)
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [user])

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
      toast.success('Marked as read')
    } catch (err) {
      toast.error('Failed to update alert status')
    }
  }

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      toast.success('All alerts marked as read!')
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Alert Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
          <BellOff size={36} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Notifications</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Alerts on bookings, subscriptions and approvals will show here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(n => (
            <div 
              key={n.id} 
              className="card glass" 
              style={{ 
                display: 'flex', 
                gap: '1rem', 
                alignItems: 'center', 
                borderLeft: n.is_read ? '1px solid var(--border-glass)' : '4px solid var(--primary)',
                opacity: n.is_read ? 0.75 : 1
              }}
            >
              <div style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex'
              }}>
                <Bell size={18} />
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{n.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {formatDate(n.created_at)}
                </span>
              </div>

              {!n.is_read && (
                <button onClick={() => handleMarkRead(n.id)} className="btn btn-ghost btn-sm" title="Mark as read">
                  <CheckCircle size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Notifications() {
  const { role } = useAuth()
  
  if (role === 'worker') {
    return (
      <WorkerLayout>
        <NotificationsContent />
      </WorkerLayout>
    )
  }
  
  return (
    <HomeOwnerLayout>
      <NotificationsContent />
    </HomeOwnerLayout>
  )
}
