import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { formatCurrency } from '../../utils/helpers'
import { ArrowLeft, Sparkles, AlertCircle, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Payment() {
  const navigate = useNavigate()
  const { worker, refreshProfile } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [txnRef, setTxnRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Admin UPI settings from system_settings
  const [adminUpiQr, setAdminUpiQr] = useState('')

  useEffect(() => {
    const plan = localStorage.getItem('cleanconnect_selected_plan')
    if (plan) {
      setSelectedPlan(JSON.parse(plan))
    } else {
      navigate('/worker/subscription')
    }

    // Fetch Admin's UPI QR url from system settings
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'admin_upi_qr_url')
      .maybeSingle()
      .then(({ data }) => {
        // Fallback placeholder QR code if none configured in settings
        setAdminUpiQr(data?.value || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=cleanconnect@bank%26pn=CleanConnect%26cu=INR')
      })
  }, [navigate])

  const handlePayment = async (e) => {
    e.preventDefault()
    if (!selectedPlan || !worker) return

    if (paymentMethod === 'upi' && !txnRef) {
      toast.error('Please enter UPI Transaction Reference Number')
      return
    }

    setSubmitting(true)
    try {
      // Call RPC function to insert subscription and payment logs and activate worker profile
      const { error } = await supabase.rpc('activate_worker_subscription', {
        p_worker_id: worker.id,
        p_plan_id: selectedPlan.id,
        p_payment_method: paymentMethod,
        p_amount: selectedPlan.price,
        p_transaction_ref: txnRef || 'OFFLINE_CASH'
      })

      if (error) throw error

      toast.success('Payment submitted! Subscription is now active.')
      localStorage.removeItem('cleanconnect_selected_plan')
      await refreshProfile()
      navigate('/worker/dashboard')
    } catch (err) {
      console.error(err)
      toast.error('Payment processing failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedPlan) return null

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '520px', margin: '0 auto' }}>
        
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription Payment</h2>

        {/* Selected Plan Summary Card */}
        <div className="card glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedPlan.name} Plan</h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration: {selectedPlan.duration_days} Days</span>
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
            {formatCurrency(selectedPlan.price)}
          </h3>
        </div>

        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Method Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Select Payment Channel</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: paymentMethod === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="payChannel" 
                  checked={paymentMethod === 'upi'} 
                  onChange={() => setPaymentMethod('upi')}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>📱 UPI QR Scanner</span>
              </label>

              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: paymentMethod === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="payChannel" 
                  checked={paymentMethod === 'cash'} 
                  onChange={() => setPaymentMethod('cash')}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>💵 Cash to Admin</span>
              </label>
            </div>
          </div>

          {/* UPI Flow */}
          {paymentMethod === 'upi' ? (
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Scan Admin UPI QR</h4>
              
              <img 
                src={adminUpiQr} 
                alt="Admin QR Scanner" 
                style={{ width: '180px', height: '180px', borderRadius: '8px', border: '1px solid var(--border-glass)' }} 
              />
              
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Scan the QR code using any UPI App (GPay, PhonePe, Paytm) and complete payment. Enter transaction ID below.
              </p>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">UPI Reference Transaction ID (12 Digits)</label>
                <input 
                  type="text" 
                  maxLength={12}
                  className="form-input" 
                  placeholder="e.g. 123456789012"
                  value={txnRef}
                  onChange={e => setTxnRef(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>
            </div>
          ) : (
            /* Cash Flow */
            <div className="card glass" style={{ display: 'flex', gap: '10px', background: 'var(--primary-light)', padding: '1rem' }}>
              <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Pay Cash Offline</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  Please pay the subscription fee in cash directly to the CleanConnect manager. The manager will verify and activate your dashboard from the admin panel.
                </p>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Submit & Activate'}
          </button>
        </form>

      </div>
    </WorkerLayout>
  )
}
