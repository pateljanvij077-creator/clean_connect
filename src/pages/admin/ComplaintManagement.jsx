import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate } from '../../utils/helpers'
import { AlertTriangle, CheckSquare } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('complaints')
      .select('*, reported_user_profile:reported_user(full_name), reported_by_profile:reported_by(full_name)')
      .then(({ data }) => setComplaints(data || []))
      .finally(() => setLoading(false))
  }, [])

  const handleResolve = async (id) => {
    const notes = window.prompt('Enter resolution notes:')
    if (notes === null) return // user cancelled

    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          resolution_notes: notes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Complaint marked as resolved!')
      setComplaints(complaints.map(c => c.id === id ? { ...c, status: 'resolved', resolution_notes: notes } : c))
    } catch (err) {
      toast.error('Failed to resolve complaint')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Complaint Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review complaints filed by homeowners and cleaners, resolve issues, or suspend users
          </p>
        </div>

        {/* Complaints List Table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : complaints.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No complaints logged</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Reporter</th>
                    <th style={{ padding: '10px' }}>Accused User</th>
                    <th style={{ padding: '10px' }}>Type</th>
                    <th style={{ padding: '10px' }}>Description</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Resolution Note</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td data-label="Reporter" style={{ padding: '10px', fontWeight: 700 }}>
                        {c.reported_by_profile?.full_name}
                      </td>
                      <td data-label="Accused User" style={{ padding: '10px' }}>
                        {c.reported_user_profile?.full_name}
                      </td>
                      <td data-label="Type" style={{ padding: '10px', textTransform: 'capitalize' }}>{c.complaint_type}</td>
                      <td data-label="Description" style={{ padding: '10px' }}>{c.description}</td>
                      <td data-label="Status" style={{ padding: '10px' }}>
                        <span className={`badge ${c.status === 'resolved' ? 'badge-verified' : 'badge-pending'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td data-label="Resolution Note" style={{ padding: '10px', color: 'var(--text-muted)' }}>{c.resolution_notes || 'N/A'}</td>
                      <td data-label="Actions" style={{ padding: '10px', textAlign: 'right' }}>
                        {c.status !== 'resolved' && (
                          <button onClick={() => handleResolve(c.id)} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                            <CheckSquare size={14} /> Resolve
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
