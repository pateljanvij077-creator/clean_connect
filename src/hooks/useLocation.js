import { useState, useCallback } from 'react'
import { getCurrentPosition, getLocationDetails } from '../utils/gps'
import { toast } from 'react-hot-toast'

export function useLocation() {
  const [detecting, setDetecting] = useState(false)
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  const detectLocation = useCallback(async () => {
    setDetecting(true)
    setError(null)
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      
      const fullLocation = {
        latitude: coords.lat,
        longitude: coords.lng,
        ...details
      }
      
      setLocation(fullLocation)
      toast.success('Location detected successfully!')
      return fullLocation
    } catch (err) {
      console.error('Error detecting location:', err)
      const errorMsg = err.message || 'Please allow GPS location access'
      setError(errorMsg)
      toast.error(errorMsg)
      return null
    } finally {
      setDetecting(false)
    }
  }, [])

  return {
    detecting,
    location,
    error,
    detectLocation,
    setLocation,
    clearLocation: () => setLocation(null)
  }
}
