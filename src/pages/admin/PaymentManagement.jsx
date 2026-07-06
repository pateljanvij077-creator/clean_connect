import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { IndianRupee, ShieldCheck, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function PaymentManagement() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, workers(full_name, phone)')
        .order('payment_date', { ascending: false })
      setPayments(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleVerifyPayment = async (paymentId, subscriptionId, workerId) => {
    try {
      // 1. Mark payment as completed
      const { error: payErr } = await supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', paymentId)

      if (payErr) throw payErr

      // 2. Mark subscription as active
      if (subscriptionId) {
        const { error: subErr } = await supabase
          .from('subscriptions')
          .update({ is_active: true })
          .eq('id', subscriptionId)

        if (subErr) throw subErr
      }

      // 3. Mark worker subscription as active
      if (workerId) {
        const { error: wErr } = await supabase
          .from('workers')
          .update({ is_subscription_active: true })
          .eq('id', workerId)

        if (wErr) throw wErr
      }

      toast.success('Offline payment verified and subscription activated!')
      fetchPayments()
    } catch (err) {
      toast.error('Verification failed')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Billing Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verify cash payments, scan UPI transaction references and monitor platforms revenues
          </p>
        </div>

        {/* Payments table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <p>No billing transactions registered yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Cleaner Name</th>
                    <th style={{ padding: '10px' }}>Amount Paid</th>
                    <th style={{ padding: '10px' }}>Channel</th>
                    <th style={{ padding: '10px' }}>Txn reference</th>
                    <th style={{ padding: '10px' }}>Billing Date</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(py => (
                    <tr key={py.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td data-label="Cleaner Name" style={{ padding: '10px', fontWeight: 700 }}>
                        {py.workers?.full_name}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{py.workers?.phone}</div>
                      </td>
                      <td data-label="Amount Paid" style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatCurrency(py.amount)}
                      </td>
                      <td data-label="Channel" style={{ padding: '10px', textTransform: 'capitalize' }}>{py.payment_method}</td>
                      <td data-label="Txn reference" style={{ padding: '10px' }}>{py.transaction_ref || 'N/A'}</td>
                      <td data-label="Billing Date" style={{ padding: '10px' }}>{formatDate(py.payment_date)}</td>
                      <td data-label="Status" style={{ padding: '10px' }}>
                        <span className={`badge ${py.status === 'completed' ? 'badge-verified' : 'badge-pending'}`}>
                          {py.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ padding: '10px', textAlign: 'right' }}>
                        {py.status === 'pending' && (
                          <button 
                            onClick={() => handleVerifyPayment(py.id, py.subscription_id, py.worker_id)} 
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '4px' }}
                          >
                            <ShieldCheck size={14} /> Verify Cash
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
