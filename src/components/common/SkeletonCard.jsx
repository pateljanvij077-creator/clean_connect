import React from 'react'

export default function SkeletonCard() {
  return (
    <div className="card glass" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-md)', width: '100%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton skeleton-circle" style={{ width: '40px', height: '40px' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '60%', height: '16px' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px' }} />
        </div>
      </div>
      <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <div className="skeleton" style={{ flex: 1, height: '36px', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ flex: 1, height: '36px', borderRadius: 'var(--radius-sm)' }} />
      </div>
    </div>
  )
}
