/**
 * GPS and Location utilities for CleanConnect
 */

/**
 * Get current coordinates from browser Geolocation API
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }
    
    // Attempt high accuracy first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        // Fallback: Retry with low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            })
          },
          (err) => {
            reject(err)
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  })
}

/**
 * Calculates distance between two points using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371 // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Formats distance for user interface
 * @param {number} km Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(km) {
  if (km === Infinity || km === null || km === undefined) return 'Unknown distance'
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Reverse geocodes lat/lng to human readable address using Nominatim (OpenStreetMap) API
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<any>} Response details
 */
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'CleanConnectApp/1.0'
      }
    })
    if (!response.ok) throw new Error('Geocoding service error')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error in reverseGeocode:', error)
    return null
  }
}

/**
 * Gets location details mapping OSM Nominatim address to local database fields
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<{state: string, city: string, area: string, address: string, society: string}>}
 */
export async function getLocationDetails(lat, lng) {
  const data = await reverseGeocode(lat, lng)
  if (!data) {
    return {
      state: '',
      city: '',
      area: '',
      address: '',
      society: ''
    }
  }

  const addr = data.address || {}
  
  // Try to find the city
  const city = addr.city || addr.town || addr.municipality || addr.city_district || addr.suburb || ''
  // Try to find local area
  const area = addr.neighbourhood || addr.suburb || addr.residential || addr.village || addr.county || ''
  // Try to find state
  const state = addr.state || ''
  // Try to extract building or society name if available
  const society = addr.neighbourhood || addr.building || addr.amenity || addr.hotel || ''

  return {
    state,
    city,
    area,
    society,
    address: data.display_name || ''
  }
}
