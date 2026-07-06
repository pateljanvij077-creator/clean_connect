import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate, formatCurrency } from '../../utils/helpers'
import { Briefcase, Search, Filter, XCircle, AlertCircle, Eye, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function BookingManagement() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          homeowners (full_name, phone, email),
          workers (full_name, phone)
        `)
        .order('created_at', { ascending: false })

      setBookings(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user)
    })
  }, [])

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt('Enter cancellation reason:')
    if (reason === null) return // cancelled prompt
    if (!reason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason.trim(),
          cancelled_by: currentUser?.id || null
        })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled successfully')
      fetchBookings()
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(null)
      }
    } catch (err) {
      toast.error('Failed to cancel booking')
    }
  }

  const filteredBookings = bookings.filter(b => {
    const homeownerName = b.homeowners?.full_name?.toLowerCase() || ''
    const workerName = b.workers?.full_name?.toLowerCase() || ''
    const matchSearch = homeownerName.includes(search.toLowerCase()) || workerName.includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge badge-verified">Completed</span>
      case 'accepted': return <span className="badge badge-pending" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>Accepted</span>
      case 'pending': return <span className="badge badge-pending">Pending</span>
      case 'cancelled': return <span className="badge badge-danger">Cancelled</span>
      default: return <span className="badge">{status}</span>
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Bookings Control</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Track service bookings, review job statuses, or cancel appointments
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search names..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '220px' }}
              />
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <select 
                className="form-input"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ paddingLeft: '36px', width: '160px', textTransform: 'capitalize' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings List Table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 0.5rem' }} />
              <p>No bookings match the filters</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Client (Homeowner)</th>
                    <th style={{ padding: '10px' }}>Cleaner (Worker)</th>
                    <th style={{ padding: '10px' }}>Schedule</th>
                    <th style={{ padding: '10px' }}>Duration & Fare</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td data-label="Client" style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700 }}>{b.homeowners?.full_name || 'Deleted Client'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.homeowners?.phone}</div>
                      </td>
                      <td data-label="Cleaner" style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700 }}>{b.workers?.full_name || 'Unassigned'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.workers?.phone || 'N/A'}</div>
                      </td>
                      <td data-label="Schedule" style={{ padding: '10px' }}>
                        <div>{b.service_date}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.service_time}</div>
                      </td>
                      <td data-label="Duration & Fare" style={{ padding: '10px' }}>
                        <div>{b.hours} Hours</div>
                        <div style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(b.total_price)}</div>
                      </td>
                      <td data-label="Status" style={{ padding: '10px' }}>{getStatusBadge(b.status)}</td>
                      <td data-label="Actions" style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => setSelectedBooking(b)} 
                            className="btn btn-secondary btn-sm"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button 
                              onClick={() => handleCancelBooking(b.id)} 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)' }}
                              title="Cancel appointment"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal Dialog */}
        {selectedBooking && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }}>
            <div className="card glass slide-up" style={{ maxWidth: '500px', width: '100%', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Booking Information</h3>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="btn btn-ghost btn-sm" style={{ padding: 0 }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '13px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Client Name</span>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedBooking.homeowners?.full_name}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{selectedBooking.homeowners?.email || 'No email'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Cleaner Assigned</span>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedBooking.workers?.full_name || 'N/A'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Date & Time</span>
                    <p style={{ fontWeight: 600, marginTop: '2px' }}>{selectedBooking.service_date} @ {selectedBooking.service_time}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Billing (Est. {selectedBooking.hours} hrs)</span>
                    <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '14px', marginTop: '2px' }}>{formatCurrency(selectedBooking.total_price)}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Service Address</span>
                  <p style={{ fontWeight: 500, marginTop: '2px', lineHeight: 1.4 }}>{selectedBooking.address}</p>
                </div>

                {selectedBooking.notes && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Job Notes</span>
                    <p style={{ fontStyle: 'italic', marginTop: '2px', color: 'var(--text-secondary)' }}>"{selectedBooking.notes}"</p>
                  </div>
                )}

                {selectedBooking.status === 'cancelled' && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Cancellation Details</span>
                    <p style={{ fontWeight: 600, marginTop: '2px' }}>Reason: "{selectedBooking.cancellation_reason || 'No reason provided'}"</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button onClick={() => setSelectedBooking(null)} className="btn btn-secondary" style={{ flex: 1 }}>Close Details</button>
                {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                  <button 
                    onClick={() => handleCancelBooking(selectedBooking.id)} 
                    className="btn btn-primary" 
                    style={{ flex: 1, background: 'var(--danger)', border: 'none' }}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
