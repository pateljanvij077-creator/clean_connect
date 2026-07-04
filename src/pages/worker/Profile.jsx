import React from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Star, ShieldCheck, BadgeAlert, Plus, Edit3 } from 'lucide-react'

export default function WorkerProfile() {
  const navigate = useNavigate()
  const { worker } = useAuth()

  if (!worker) return null

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Profile Card Header */}
        <div className="card glass" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {worker.avatar_url ? (
            <img 
              src={worker.avatar_url} 
              alt={worker.full_name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={36} color="var(--primary)" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{worker.full_name}</h2>
              {worker.is_verified ? (
                <ShieldCheck size={20} color="var(--success)" />
              ) : (
                <span className="badge badge-pending">PENDING APPROVAL</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {worker.worker_type?.replace('_', ' ')} • {worker.gender}
            </p>
          </div>

          <button onClick={() => navigate('/worker/edit-profile')} className="btn btn-primary" style={{ gap: '6px' }}>
            <Edit3 size={16} /> Edit Profile
          </button>
        </div>

        {/* Detailed Info Cards */}
        <div className="grid-2">
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Profile Summary</h3>
            <p><strong>Experience:</strong> {worker.experience_years} Years</p>
            <p><strong>Date of Birth:</strong> {formatDate(worker.dob)}</p>
            <p><strong>Primary Phone:</strong> {worker.phone}</p>
            <p><strong>Backup Phone:</strong> {worker.phone2}</p>
            <p><strong>Languages:</strong> {(worker.languages || []).join(', ')}</p>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Service Pricing</h3>
            <p><strong>Hourly Charge:</strong> {formatCurrency(worker.pricing_per_hour)}/hour</p>
            <p><strong>Daily Charge:</strong> {formatCurrency(worker.pricing_per_day)}/day</p>
            {worker.pricing_note && <p><strong>Rates Note:</strong> {worker.pricing_note}</p>}
            
            {worker.upi_qr_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--success)', fontSize: '13px', fontWeight: 600 }}>
                <ShieldCheck size={16} /> UPI QR Code Uploaded
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                <BadgeAlert size={16} /> No UPI QR uploaded (Homeowners cannot scan & pay)
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="card glass">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>About Me (Bio)</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{worker.bio || 'No details provided yet.'}</p>
        </div>

      </div>
    </WorkerLayout>
  )
}
