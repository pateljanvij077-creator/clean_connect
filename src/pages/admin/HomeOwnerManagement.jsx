import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate } from '../../utils/helpers'
import { AlertCircle } from 'lucide-react'

export default function HomeOwnerManagement() {
  const [homeowners, setHomeowners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('homeowners')
      .select('*')
      .then(({ data }) => setHomeowners(data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Home Owners Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            View registered home owners, contact numbers, and service locations
          </p>
        </div>

        {/* Directory table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : homeowners.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <AlertCircle size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <p>No homeowners registered yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Phone</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Society / Landmark</th>
                    <th style={{ padding: '10px' }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {homeowners.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{h.full_name}</td>
                      <td style={{ padding: '10px' }}>{h.phone}</td>
                      <td style={{ padding: '10px' }}>{h.email || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>
                        <div>{h.society_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.address}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{formatDate(h.created_at)}</td>
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
