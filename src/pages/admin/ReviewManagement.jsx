import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate } from '../../utils/helpers'
import { Star, Trash2, Search, Filter, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('reviews')
        .select(`
          *,
          homeowners (full_name),
          workers (full_name)
        `)
        .order('created_at', { ascending: false })

      setReviews(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleDeleteReview = async (id) => {
    const confirm = window.confirm('Are you sure you want to delete this review? This action cannot be undone.')
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Review deleted successfully')
      fetchReviews()
    } catch (err) {
      toast.error('Failed to delete review')
    }
  }

  const filteredReviews = reviews.filter(r => {
    const matchSearch = r.comment?.toLowerCase().includes(search.toLowerCase()) || 
      r.homeowners?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.workers?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter
    return matchSearch && matchRating
  })

  // Calculate rating stats
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
    : '0.0'

  const renderStars = (rating) => {
    return (
      <div style={{ display: 'flex', gap: '2px', color: '#fbbf24' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            size={14} 
            fill={s <= rating ? '#fbbf24' : 'transparent'} 
            color={s <= rating ? '#fbbf24' : '#cbd5e1'} 
          />
        ))}
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ratings & Reviews Moderation</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Inspect client feedback, monitor overall performance ratings, and delete spam reviews
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search reviews & names..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '220px' }}
              />
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <select 
                className="form-input"
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value)}
                style={{ paddingLeft: '36px', width: '150px' }}
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          <div className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Feedbacks</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>{totalReviews}</h3>
          </div>

          <div className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Average Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>{averageRating}</h3>
              <Star size={24} fill="#fbbf24" color="#fbbf24" />
            </div>
          </div>

          <div className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Platform Status</span>
            <span className="badge badge-verified" style={{ fontSize: '12px', padding: '6px 12px', marginTop: '8px' }}>HEALTHY</span>
          </div>
        </div>

        {/* Reviews List Table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 0.5rem' }} />
              <p>No reviews found matching the filter</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Homeowner</th>
                    <th style={{ padding: '10px' }}>Worker Reviewed</th>
                    <th style={{ padding: '10px' }}>Rating</th>
                    <th style={{ padding: '10px', width: '40%' }}>Comment</th>
                    <th style={{ padding: '10px' }}>Submitted At</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{r.homeowners?.full_name || 'Anonymous User'}</td>
                      <td style={{ padding: '10px' }}>{r.workers?.full_name || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>{renderStars(r.rating)}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {r.comment ? `"${r.comment}"` : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No comment text provided</span>}
                      </td>
                      <td style={{ padding: '10px' }}>{formatDate(r.created_at)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteReview(r.id)} 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', gap: '4px' }}
                          title="Delete Review"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
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
