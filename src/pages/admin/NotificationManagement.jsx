import React, { useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { Bell } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function NotificationManagement() {
  const [target, setTarget] = useState('all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('general')
  const [sending, setSending] = useState(false)

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!title || !message) {
      toast.error('Title and message are required')
      return
    }

    setSending(true)
    try {
      // 1. Get targeted user ids based on selection
      let userQuery = supabase.from('users').select('id')

      if (target === 'workers') {
        userQuery = userQuery.eq('roles.name', 'worker')
      } else if (target === 'homeowners') {
        userQuery = userQuery.eq('roles.name', 'homeowner')
      }

      // Fetch user profile IDs
      const { data: usersData, error: usersError } = await userQuery
      if (usersError) throw usersError

      if (!usersData || usersData.length === 0) {
        toast.error('No users found in this targeted category')
        setSending(false)
        return
      }

      // 2. Prepare bulk insert records
      const insertRows = usersData.map(u => ({
        user_id: u.id,
        title,
        message,
        type,
        is_read: false
      }))

      // Write in batches of 100 to avoid overloading limits
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(insertRows)

      if (notifyError) throw notifyError

      toast.success(`Broadcast announcement sent to ${insertRows.length} users!`)
      setTitle('')
      setMessage('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to send broadcast notices')
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Broadcast Announcement Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Push notifications and warnings to homeowners, cleaners, or all users
          </p>
        </div>

        <form onSubmit={handleBroadcast} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Target Audience</label>
            <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="all">📢 All Registered Users</option>
              <option value="workers">🧹 Workers Only</option>
              <option value="homeowners">🏠 Home Owners Only</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Alert Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="general">Info Announcement</option>
              <option value="admin">System Admin Notice</option>
              <option value="subscription">Subscription Notice</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Announcement Title</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Schedule Maintenance, Subscription Renewals..." 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Announcement Message</label>
            <textarea 
              className="form-input" 
              rows={4} 
              placeholder="Type your message details here..." 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ gap: '6px' }} disabled={sending}>
            {sending ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : <><Bell size={16} /> Broadcast Announcement</>}
          </button>
        </form>

      </div>
    </AdminLayout>
  )
}
