import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getWorkerById } from '../../services/workers'
import { getStatusClass, formatCurrency } from '../../utils/helpers'
import { Star, ArrowLeft, Phone, MessageCircle, MapPin, BadgeCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function WorkerDetail() {
  const { workerId } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWorkerById(workerId)
      .then(setWorker)
      .catch(err => {
        console.error(err)
        toast.error('Failed to load cleaner profile')
      })
      .finally(() => setLoading(false))
  }, [workerId])

  if (loading) {
    return (
      <HomeOwnerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spinner" />
        </div>
      </HomeOwnerLayout>
    )
  }

  if (!worker) {
    return (
      <HomeOwnerLayout>
        <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem' }}>
          <h3>Profile Not Found</h3>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </HomeOwnerLayout>
    )
  }

  const handleCall = () => {
    window.open(`tel:${worker.phone}`)
  }

  const handleWhatsapp = () => {
    const cleanPhone = worker.phone.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(`Hello ${worker.full_name}, I saw your profile on CleanConnect and would like to talk about a booking request.`)
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank')
  }

  return (
    <HomeOwnerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Back control */}
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Card */}
        <div className="card glass" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {worker.avatar_url ? (
            <img 
              src={worker.avatar_url} 
              alt={worker.full_name} 
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={48} color="var(--primary)" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{worker.full_name}</h2>
              {worker.is_verified && <BadgeCheck color="var(--success)" size={24} />}
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
              {worker.worker_type?.replace('_', ' ')} • {worker.gender}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${getStatusClass(worker.availability_status)}`}>
                {worker.availability_status}
              </span>
              <span className="badge badge-verified" style={{ textTransform: 'none' }}>
                {worker.experience_years} Years Experience
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={handleCall} className="btn btn-secondary" style={{ gap: '6px' }}>
              <Phone size={16} /> Call Cleaner
            </button>
            <button onClick={handleWhatsapp} className="btn btn-secondary" style={{ gap: '6px' }}>
              <MessageCircle size={16} /> WhatsApp
            </button>
          </div>
        </div>

        {/* Bio, Rates, Locations details */}
        <div className="grid-2">
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Biography</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {worker.bio || 'No biography written yet.'}
            </p>
            
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '0.5rem' }}>Languages Spoken</h4>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(worker.languages || []).map((l, i) => (
                <span key={i} className="badge badge-verified" style={{ textTransform: 'none' }}>{l}</span>
              ))}
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pricing Rate Details</h3>
            <p><strong>Hourly Rate:</strong> {formatCurrency(worker.pricing_per_hour)}</p>
            <p><strong>Daily Rate:</strong> {formatCurrency(worker.pricing_per_day)}</p>
            {worker.pricing_note && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Note:</strong> {worker.pricing_note}
              </p>
            )}

            {!worker.is_subscription_active ? (
              <button className="btn btn-danger" disabled style={{ width: '100%', marginTop: 'auto', gap: '6px' }}>
                <ShieldAlert size={18} /> Booking Disabled (Sub Expired)
              </button>
            ) : (
              <button 
                onClick={() => navigate(`/homeowner/book/${worker.id}`)} 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Proceed to Booking
              </button>
            )}
          </div>
        </div>

        {/* Reviews List */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ratings & Reviews</h3>
          
          {(!worker.reviews || worker.reviews.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
              No ratings submitted yet for this cleaner.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {worker.reviews.map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {r.homeowners?.full_name || 'Home Owner'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontWeight: 700, fontSize: '13px' }}>
                      <Star size={14} fill="#f59e0b" /> {r.rating}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {r.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </HomeOwnerLayout>
  )
}
