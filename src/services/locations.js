import { supabase } from '../supabase/client'

/**
 * Location hierarchy and autocomplete services
 */

export async function getStates() {
  const { data, error } = await supabase
    .from('states')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function getCities(stateId) {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('state_id', stateId)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function getAreas(cityId) {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('city_id', cityId)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function getSocieties(areaId) {
  const { data, error } = await supabase
    .from('societies')
    .select('*')
    .eq('area_id', areaId)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Fuzzy search on societies for smart auto-suggestions
 * @param {string} query Search input
 * @param {string} cityId Optional city filter
 * @returns {Promise<Array>} Suggestion matches
 */
export async function searchSocieties(query, cityId = null) {
  if (!query || query.length < 2) return []
  
  let builder = supabase
    .from('societies')
    .select('*, areas(name, city_id), cities(name)')
    .ilike('name', `%${query}%`)
    .limit(10)
    
  if (cityId) {
    builder = builder.eq('city_id', cityId)
  }

  const { data, error } = await builder
  if (error) {
    console.error('Error searching societies:', error)
    return []
  }
  return data
}

/**
 * Find or create a society to prevent duplicates
 * @param {object} param0 
 * @returns {Promise<object>} Created/existing society
 */
export async function findOrCreateSociety({ name, areaId, cityId, latitude, longitude, address }) {
  const normalizedName = name.trim()
  
  // 1. Check if society exists in this city
  const { data: existing, error: checkError } = await supabase
    .from('societies')
    .select('*')
    .eq('name', normalizedName)
    .eq('city_id', cityId)
    .maybeSingle()

  if (checkError) throw checkError
  if (existing) return existing

  // 2. If it does not exist, insert it
  const { data: created, error: insertError } = await supabase
    .from('societies')
    .insert([{
      name: normalizedName,
      area_id: areaId,
      city_id: cityId,
      latitude,
      longitude,
      address
    }])
    .select()
    .single()

  if (insertError) throw insertError
  return created
}
