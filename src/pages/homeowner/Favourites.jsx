import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getFavorites, toggleFavorite } from '../../services/bookings'
import { useAuth } from '../../hooks/useAuth'
import WorkerCard from '../../components/common/WorkerCard'
import { Heart, HeartCrack } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Favourites() {
  const navigate = useNavigate()
  const { homeowner } = useAuth()
  const [favoritesList, setFavoritesList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (homeowner) {
      getFavorites(homeowner.id)
        .then(data => setFavoritesList(data.map(f => f.workers)))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [homeowner])

  const handleFavoriteToggle = async (workerId, nextFavState) => {
    if (!homeowner) return
    try {
      await toggleFavorite(homeowner.id, workerId, nextFavState)
      setFavoritesList(favoritesList.filter(w => w.id !== workerId))
      toast.success('Removed from favorites')
    } catch (err) {
      toast.error('Failed to update favorites')
    }
  }

  return (
    <HomeOwnerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Saved Cleaners</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : favoritesList.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <HeartCrack size={36} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Saved Cleaners</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Cleaner profiles you save will appear here for fast scheduling.
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {favoritesList.map(w => (
              <WorkerCard 
                key={w.id}
                worker={w}
                isFavorited={true}
                onFavoriteToggle={handleFavoriteToggle}
                onBook={(id) => navigate(`/homeowner/book/${id}`)}
                onViewProfile={(id) => navigate(`/homeowner/worker/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </HomeOwnerLayout>
  )
}
