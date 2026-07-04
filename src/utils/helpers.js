/**
 * General helper functions for CleanConnect
 */

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatTime(timeStr) {
  if (!timeStr) return ''
  // If time is in HH:MM:SS form
  const [hours, minutes] = timeStr.split(':')
  const hr = parseInt(hours)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const displayHr = hr % 12 || 12
  return `${displayHr}:${minutes} ${ampm}`
}

export function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function getInitials(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'badge-pending'
    case 'approved':
    case 'completed':
    case 'accepted':
    case 'available':
      return 'badge-verified'
    case 'rejected':
    case 'cancelled':
    case 'failed':
    case 'offline':
      return 'badge-danger'
    default:
      return 'badge-pending'
  }
}

export function truncateText(text, length = 100) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export function debounce(func, delay) {
  let timeoutId
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(null, args)
    }, delay)
  }
}
