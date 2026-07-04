import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Check, ShieldCheck, CreditCard } from 'lucide-react'

export default function Subscription() {
  const navigate = useNavigate()
  const { worker } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    // Fetch active subscription plans from database
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setPlans(data || []))

    if (worker) {
      // Fetch payment history logs
      supabase
        .from('payments')
        .select('*')
        .eq('worker_id', worker.id)
        .order('payment_date', { ascending: false })
        .then(({ data }) => setPayments(data || []))
        .finally(() => setLoading(false))
    }
  }, [worker])

  const selectPlan = (plan) => {
    // Store selected plan details in state/storage and navigate to payment
    localStorage.setItem('cleanconnect_selected_plan', JSON.stringify(plan))
    navigate('/worker/payment')
  }

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Choose a plan to activate search listing and bookings
          </p>
        </div>

        {/* Current status display */}
        {worker?.is_subscription_active ? (
          <div className="card glass" style={{ borderLeft: '4px solid var(--success)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="var(--success)" />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Your Professional Subscription is ACTIVE</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Listing expires on {formatDate(worker.subscription_expiry)}. Homeowners can find and book your services.
              </p>
            </div>
          </div>
        ) : (
          <div className="card glass" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="var(--danger)" />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Subscription Expired</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Select a plan below to activate booking requests and appear in location matching.
              </p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid-4" style={{ marginTop: '0.5rem' }}>
          {plans.map(p => (
            <div 
              key={p.id} 
              className="card glass" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                border: worker?.subscription_expiry && p.price > 1000 ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{p.name}</h4>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', margin: '0.5rem 0' }}>
                  {formatCurrency(p.price)}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration: {p.duration_days} Days</span>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', fontSize: '12px', padding: '0.5rem 0' }}>
                {(p.benefits || []).map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="var(--success)" /> {b}
                  </li>
                ))}
              </ul>

              <button onClick={() => selectPlan(p)} className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 'auto' }}>
                Activate {p.name}
              </button>
            </div>
          ))}
        </div>

        {/* Payment log history */}
        <div className="card glass" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Billing Log History</h3>
          {payments.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No transactions recorded.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Amount</th>
                    <th style={{ padding: '8px' }}>Method</th>
                    <th style={{ padding: '8px' }}>Txn Ref</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(py => (
                    <tr key={py.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '8px' }}>{formatDate(py.payment_date)}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{formatCurrency(py.amount)}</td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>{py.payment_method}</td>
                      <td style={{ padding: '8px' }}>{py.transaction_ref || 'N/A'}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${py.status === 'completed' ? 'badge-verified' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                          {py.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </WorkerLayout>
  )
}
