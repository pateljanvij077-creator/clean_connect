import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Check, ShieldCheck, Plus, Trash2, Edit } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  // Add plan form states
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [benefitsText, setBenefitsText] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price')
      setPlans(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleAddPlan = async (e) => {
    e.preventDefault()
    if (!name || !price || !duration) return

    try {
      const benefits = benefitsText.split(',').map(b => b.trim()).filter(Boolean)
      const { error } = await supabase
        .from('subscription_plans')
        .insert([{
          name,
          price: parseFloat(price),
          duration_days: parseInt(duration),
          benefits,
          is_active: true
        }])

      if (error) throw error
      toast.success('Subscription plan created successfully!')
      setName('')
      setPrice('')
      setDuration('')
      setBenefitsText('')
      setShowAddModal(false)
      fetchPlans()
    } catch (err) {
      toast.error('Failed to create plan')
    }
  }

  const handleDeletePlan = async (id) => {
    const confirm = window.confirm('Delete this plan?')
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Plan deleted')
      fetchPlans()
    } catch (err) {
      toast.error('Failed to delete plan')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription Plan Manager</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Create, edit and manage pricing tiers for cleaning workers
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ gap: '4px' }}>
            <Plus size={16} /> Create Plan
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid-3">
            {plans.map(p => (
              <div key={p.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.name}</h4>
                  <button onClick={() => handleDeletePlan(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {formatCurrency(p.price)}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration: {p.duration_days} Days</span>
                
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', listStyle: 'none' }}>
                  {(p.benefits || []).map((b, i) => (
                    <li key={i} style={{ display: 'flex', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Check size={14} color="var(--success)" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }}>
            <form onSubmit={handleAddPlan} className="card glass slide-up" style={{ maxWidth: '440px', width: '100%', gap: '1rem' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Pricing Plan</h3>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Plan Name</label>
                <input type="text" className="form-input" placeholder="e.g. Monthly Pro" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Price (INR)</label>
                <input type="number" className="form-input" placeholder="e.g. 299" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Duration (Days)</label>
                <input type="number" className="form-input" placeholder="e.g. 30" value={duration} onChange={e => setDuration(e.target.value)} required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Benefits list (comma separated)</label>
                <input type="text" className="form-input" placeholder="Priority Listing, Search Badges, Unlimited Requests" value={benefitsText} onChange={e => setBenefitsText(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Plan</button>
              </div>
            </form>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
