// Vietnamese retailers selling gold
export const RETAILERS = [
  'SJC',
  'DOJI',
  'PNJ',
  'Bảo Tín Minh Châu',
  'Phú Quý',
  'Bảo Tín Phú Khương',
  'Mi Hồng',
] as const

export type Retailer = typeof RETAILERS[number]

// Vietnamese provinces and major cities
export const PROVINCES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Biên Hòa',
  'Nha Trang',
  'Huế',
  'Vũng Tàu',
  'Buôn Ma Thuột',
  'Quy Nhơn',
  'Thái Nguyên',
] as const

export type Province = typeof PROVINCES[number]

// Gold product types
export const PRODUCT_TYPES = [
  { value: 'SJC_BARS', label: 'Vàng miếng SJC', shortLabel: 'Miếng SJC' },
  { value: 'SJC_RINGS', label: 'Vàng nhẫn SJC', shortLabel: 'Nhẫn SJC' },
  { value: 'GOLD_9999', label: 'Vàng 9999', shortLabel: '9999' },
  { value: 'GOLD_999', label: 'Vàng 999', shortLabel: '999' },
  { value: 'GOLD_24K', label: 'Vàng 24K', shortLabel: '24K' },
] as const

export type ProductType = typeof PRODUCT_TYPES[number]['value']

// Auto-refresh interval for price updates (5 minutes)
export const REFRESH_INTERVAL = 5 * 60 * 1000 // milliseconds

// Chart time ranges
export const TIME_RANGES = [
  { value: 'day', label: 'Ngày', days: 1 },
  { value: 'week', label: 'Tuần', days: 7 },
  { value: 'month', label: 'Tháng', days: 30 },
  { value: 'quarter', label: '3 Tháng', days: 90 },
  { value: 'year', label: 'Năm', days: 365 },
] as const

export type TimeRange = typeof TIME_RANGES[number]['value']

// Price trend directions
export const PRICE_TRENDS = {
  UP: 'up',
  DOWN: 'down',
  STABLE: 'stable',
} as const

export type PriceTrend = typeof PRICE_TRENDS[keyof typeof PRICE_TRENDS]

// Currency format
export const CURRENCY_CONFIG = {
  locale: 'vi-VN',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const

// Date format
export const DATE_FORMAT = {
  short: 'dd/MM/yyyy',
  long: 'dd/MM/yyyy HH:mm:ss',
  display: 'PPP',
  time: 'HH:mm',
} as const
