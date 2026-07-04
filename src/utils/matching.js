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
export function matchWorkers(homeowner, workers, workerLocations) {
  if (!homeowner || !workers) return []

  const homeownerLat = homeowner.latitude
  const homeownerLng = homeowner.longitude
  const homeownerSocietyId = homeowner.society_id
  const homeownerAreaId = homeowner.area_id
  const homeownerCityId = homeowner.city_id

  return workers
    .map((worker) => {
      // Find all locations registered for this worker
      const locations = workerLocations.filter((loc) => loc.worker_id === worker.id)
      
      let maxScore = 0
      let minDistance = Infinity
      let matchedLocationType = 'GPS Distance Only'

      // Check each location registered by the worker to find the best match
      locations.forEach((loc) => {
        let score = 0
        let type = 'GPS'

        if (homeownerSocietyId && loc.society_id === homeownerSocietyId) {
          score = 1000 // Highest priority
          type = 'Same Society'
        } else if (homeownerAreaId && loc.area_id === homeownerAreaId) {
          score = 500
          type = 'Same Area'
        } else if (homeownerCityId && loc.city_id === homeownerCityId) {
          score = 250
          type = 'Same City'
        }

        // Calculate actual GPS distance between homeowner and worker location
        const distance = calculateDistance(
          homeownerLat, 
          homeownerLng, 
          loc.latitude || worker.latitude, 
          loc.longitude || worker.longitude
        )

        // Scoring adjustment based on distance (closer = higher score)
        const distanceScore = distance < Infinity ? Math.max(0, 100 - distance) : 0
        const totalLocScore = score + distanceScore

        if (totalLocScore > maxScore) {
          maxScore = totalLocScore
          minDistance = distance
          matchedLocationType = type
        }
      })

      // Fallback: If no matching location list, compute direct worker distance
      if (locations.length === 0) {
        minDistance = calculateDistance(
          homeownerLat, 
          homeownerLng, 
          worker.latitude, 
          worker.longitude
        )
      }

      // Add scoring based on rating and total completed jobs as tie-breakers
      const ratingBonus = Number(worker.rating || 0) * 5
      const experienceBonus = Math.min(10, Number(worker.experience_years || 0))
      const finalScore = maxScore + ratingBonus + experienceBonus

      return {
        ...worker,
        distance: minDistance,
        matchScore: finalScore,
        matchType: matchedLocationType
      }
    })
    // Filters: must be available, verified (approved), and have an active subscription
    .filter((w) => w.is_available && w.verification_status === 'approved' && w.is_subscription_active)
    // Sort: highest score first
    .sort((a, b) => b.matchScore - a.matchScore)
}
