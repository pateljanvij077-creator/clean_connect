import { supabase } from '../supabase/client'

/**
 * Booking lifecycle, review, and homeowner favorites services
 */

export async function createBooking(bookingData) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getHomeownerBookings(homeownerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, workers(*)')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getWorkerBookings(workerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, homeowners(*)')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getBookingById(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, homeowners(*), workers(*)')
    .eq('id', bookingId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateBookingStatus(bookingId, status, extraData = {}) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, ...extraData })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelBooking(bookingId, cancelledBy, reason) {
  return updateBookingStatus(bookingId, 'cancelled', {
    cancelled_by: cancelledBy,
    cancellation_reason: reason
  })
}

export async function confirmBookingCall(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ call_confirmed: true })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Reviews & Ratings
 */
export async function createReview(reviewData) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([reviewData])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Favourites Manager
 */
export async function toggleFavorite(homeownerId, workerId, isFav) {
  if (isFav) {
    // Add to favorites
    const { data, error } = await supabase
      .from('favorites')
      .insert([{ homeowner_id: homeownerId, worker_id: workerId }])
      .select()
    if (error) throw error
    return true
  } else {
    // Remove from favorites
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('homeowner_id', homeownerId)
      .eq('worker_id', workerId)
    if (error) throw error
    return false
  }
}

export async function getFavorites(homeownerId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, workers(*)')
    .eq('homeowner_id', homeownerId)
  if (error) throw error
  return data
}
