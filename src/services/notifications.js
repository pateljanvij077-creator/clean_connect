import { supabase } from '../supabase/client'

/**
 * Realtime and in-app Notification services
 */

export async function getUserNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function markNotificationAsRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
  if (error) throw error
}

export async function createNotification(userId, title, message, type = 'general', data = {}) {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      title,
      message,
      type,
      data,
      is_read: false
    }])
    .select()
    .single()
  if (error) throw error
  return notification
}

export async function getUnreadNotificationCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) return 0
  return count
}

/**
 * Set up real-time subscription for new notifications
 * @param {string} userId 
 * @param {function} onNotificationReceived 
 * @returns {object} Subscription handler to unsubscribe
 */
export function subscribeToNotifications(userId, onNotificationReceived) {
  return supabase
    .channel(`public:notifications:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotificationReceived(payload.new)
      }
    )
    .subscribe()
}
