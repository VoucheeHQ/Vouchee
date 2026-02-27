import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

// ─── Class Name Merger ──────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Formatters ────────────────────────────────────────
export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'PPP p')
}

export function formatTime(time: string): string {
  // Assumes time is in HH:mm format
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

// ─── Currency Formatters ────────────────────────────────────
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function formatPriceCompact(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── String Helpers ─────────────────────────────────────────
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Validation Helpers ─────────────────────────────────────
export function isValidPostcode(postcode: string): boolean {
  // UK postcode validation
  const regex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
  return regex.test(postcode.trim())
}

export function isValidPhone(phone: string): boolean {
  // UK phone validation (simple)
  const cleaned = phone.replace(/\s/g, '')
  return /^(\+44|0)[1-9]\d{9}$/.test(cleaned)
}

// ─── Array Helpers ──────────────────────────────────────────
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  return [...new Map(array.map(item => [item[key], item])).values()]
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const group = String(item[key])
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// ─── Frequency Helpers ──────────────────────────────────────
export function getFrequencyLabel(frequency: 'weekly' | 'fortnightly' | 'monthly'): string {
  const labels = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
  }
  return labels[frequency]
}

export function getFrequencyDescription(frequency: 'weekly' | 'fortnightly' | 'monthly'): string {
  const descriptions = {
    weekly: 'Every week',
    fortnightly: 'Every 2 weeks',
    monthly: 'Once per month',
  }
  return descriptions[frequency]
}

// ─── Status Badge Helpers ───────────────────────────────────
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Subscription statuses
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800',
    
    // Application statuses
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800',
    
    // Request/Session statuses
    assigned: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    no_show: 'bg-red-100 text-red-800',
    
    // Issue statuses
    open: 'bg-yellow-100 text-yellow-800',
    investigating: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}
