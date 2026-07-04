import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ShieldCheck, UserCheck, Users, Briefcase, IndianRupee, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    homeowners: 0,
    workers: 0,
    bookings: 0,
    payments: 0,
    unverified: 0
  })

  const [pendingWorkers, setPendingWorkers] = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: hoCount } = await supabase.from('homeowners').select('*', { count: 'exact', head: true })
        const { count: wCount } = await supabase.from('workers').select('*', { count: 'exact', head: true })
        const { count: bCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
        const { count: uCount } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
        
        // Sum total payments
        const { data: payData } = await supabase.from('payments').select('amount')
        const totalRevenue = (payData || []).reduce((sum, item) => sum + Number(item.amount), 0)

        setCounts({
          homeowners: hoCount || 0,
          workers: wCount || 0,
          bookings: bCount || 0,
          payments: totalRevenue,
          unverified: uCount || 0
        })

        // Fetch pending workers list for quick actions
        const { data: wPending } = await supabase
          .from('workers')
          .select('*')
          .eq('verification_status', 'pending')
          .limit(3)
        setPendingWorkers(wPending || [])

        // Set up dummy mock data for growth analytics charts
        setChartData([
          { month: 'Jan', Bookings: 12, Revenue: 2400 },
          { month: 'Feb', Bookings: 18, Revenue: 3600 },
          { month: 'Mar', Bookings: 25, Revenue: 5000 },
          { month: 'Apr', Bookings: 32, Revenue: 6400 },
          { month: 'May', Bookings: 45, Revenue: 9000 },
          { month: 'Jun', Bookings: 60, Revenue: 12000 }
        ])

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleQuickApprove = async (workerId) => {
    try {
      const { error } = await supabase
        .from('workers')
        .update({ verification_status: 'approved', is_verified: true })
        .eq('id', workerId)

      if (error) throw error
      toast.success('Worker approved successfully!')
      setPendingWorkers(pendingWorkers.filter(w => w.id !== workerId))
      setCounts(prev => ({ ...prev, unverified: Math.max(0, prev.unverified - 1) }))
    } catch (err) {
      toast.error('Approval failed')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Systems Analytics Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            System-wide user registration, booking analytics, and verification counts
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid-4">
          <div className="card glass" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{counts.homeowners}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Home Owners</p>
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{counts.workers}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Cleaners</p>
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--success-light)', padding: '10px', borderRadius: '12px', color: 'var(--success)' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{counts.bookings}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Bookings</p>
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--success-light)', padding: '10px', borderRadius: '12px', color: 'IndianRed' }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(counts.payments)}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Platform Revenue</p>
            </div>
          </div>
        </div>

        {/* Verification Review Notice bar */}
        {counts.unverified > 0 && (
          <div className="card glass" style={{ background: 'var(--warning-light)', borderLeft: '4px solid var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={20} color="var(--warning)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                You have {counts.unverified} worker profiles pending document verification reviews.
              </span>
            </div>
            <button onClick={() => navigate('/admin/workers')} className="btn btn-secondary btn-sm">
              Review Now
            </button>
          </div>
        )}

        {/* Chart Growth & Quick actions */}
        <div className="grid-2">
          {/* Revenue Chart */}
          <div className="card glass" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Monthly Revenue Growth</h3>
            <div style={{ flex: 1, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Approvals list */}
          <div className="card glass" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Quick Verification Panel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
              {pendingWorkers.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{w.full_name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Exp: {w.experience_years} years • {w.phone}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => navigate('/admin/workers')} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>
                      Docs
                    </button>
                    <button onClick={() => handleQuickApprove(w.id)} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>
                      Approve
                    </button>
                  </div>
                </div>
              ))}
              {pendingWorkers.length === 0 && (
                <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending worker verifications.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
