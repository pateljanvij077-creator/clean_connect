import { calculateDistance } from './gps'

/**
 * Smart location matching algorithm for CleanConnect
 * Priority: 
 * 1. Same Society
 * 2. Same Area
 * 3. Same City
 * 4. GPS Distance
 * 
 * Also filters workers based on active subscription, approval and availability status.
 * 
 * @param {object} homeowner - Homeowner profile with location details
 * @param {Array} workers - List of workers fetched from Supabase
 * @param {Array} workerLocations - Locations associated with each worker
 * @returns {Array} List of matched, scored and sorted workers
 */
export function matchWorkers(homeowner, workers, workerLocations, systemSettings = []) {
  if (!homeowner || !workers) return []

  const homeownerLat = homeowner.latitude
  const homeownerLng = homeowner.longitude

  // Get settings helper
  const getSettingVal = (key, defaultVal) => {
    const s = systemSettings.find(item => item.key === key)
    return s ? s.value : defaultVal
  }

  const allowBusyVal = getSettingVal('allow_busy_workers', 'true') === 'true'

  const matchedAndScored = workers
    .map((worker) => {
      const travelRadius = Number(worker.travel_radius || 10)
      let maxLocScore = -1
      let minDistance = Infinity
      let matchedLocationType = 'Auto Location'

      // Check Auto Location (Live GPS coordinates match)
      if (
        homeownerLat !== null && homeownerLat !== undefined &&
        homeownerLng !== null && homeownerLng !== undefined &&
        worker.latitude !== null && worker.latitude !== undefined &&
        worker.longitude !== null && worker.longitude !== undefined
      ) {
        const liveDistance = calculateDistance(
          homeownerLat,
          homeownerLng,
          worker.latitude,
          worker.longitude
        )

        if (liveDistance !== Infinity && liveDistance <= travelRadius) {
          const distanceScore = Math.max(0, 100 - liveDistance)
          maxLocScore = 2000 + distanceScore
          minDistance = liveDistance
        }
      }

      if (maxLocScore === -1) {
        return null
      }

      // Add scoring based on rating and total completed jobs as tie-breakers
      const ratingBonus = Number(worker.rating || 0) * 5
      const experienceBonus = Math.min(10, Number(worker.experience_years || 0))
      
      // Availability priority: Available Now appears first
      const isAvailable = worker.availability_status === 'available'
      const isBusy = worker.availability_status === 'busy'
      const availabilityBonus = isAvailable ? 20000 : (isBusy ? 0 : -50000)

      const finalScore = maxLocScore + ratingBonus + experienceBonus + availabilityBonus

      return {
        ...worker,
        distance: minDistance,
        matchScore: finalScore,
        matchType: matchedLocationType
      }
    })
    .filter(Boolean)

  // Filters: must be approved, subscription active, active, and available/busy (based on settings)
  const activeWorkers = matchedAndScored.filter((w) => {
    const isApproved = w.verification_status === 'approved'
    const isSubActive = w.is_subscription_active
    const isActive = w.is_active !== false
    
    const isOfflineOrLeave = w.availability_status === 'offline' || w.availability_status === 'on_leave'
    const isBusy = w.availability_status === 'busy'
    
    if (isOfflineOrLeave) return false
    if (isBusy && !allowBusyVal) return false
    
    return isApproved && isSubActive && isActive
  })

  // Smart Search Expansion
  // If fewer than 10 workers are found, expand the search radius progressively
  const getWorkersInRadius = (workersList, radiusLimit) => {
    return workersList.filter(w => w.distance === Infinity || w.distance <= radiusLimit)
  }

  let finalWorkers = activeWorkers

  const workersUnder3km = getWorkersInRadius(activeWorkers, 3)
  if (workersUnder3km.length >= 10) {
    finalWorkers = workersUnder3km
  } else {
    const workersUnder5km = getWorkersInRadius(activeWorkers, 5)
    if (workersUnder5km.length >= 10) {
      finalWorkers = workersUnder5km
    } else {
      const workersUnder10km = getWorkersInRadius(activeWorkers, 10)
      if (workersUnder10km.length >= 10) {
        finalWorkers = workersUnder10km
      } else {
        finalWorkers = activeWorkers
      }
    }
  }

  // Sort: highest score first
  return finalWorkers.sort((a, b) => b.matchScore - a.matchScore)
}
