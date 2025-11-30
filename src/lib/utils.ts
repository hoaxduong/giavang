import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDate, formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { CURRENCY_CONFIG } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in Vietnamese Dong
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.currency,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
  }).format(amount)
}

/**
 * Format currency compact (e.g., 1.5M instead of 1,500,000)
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}tr` // triệu
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k` // nghìn
  }
  return amount.toString()
}

/**
 * Format date with Vietnamese locale
 */
export function formatVietnameseDate(date: Date | string, formatString: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDate(dateObj, formatString, { locale: vi })
}

/**
 * Format relative time in human-readable format (e.g., "2 giờ trước", "5 phút trước")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Không xác định'
  }
  
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: vi,
  })
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Get price trend direction
 */
export function getPriceTrend(change: number): 'up' | 'down' | 'stable' {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'stable'
}
