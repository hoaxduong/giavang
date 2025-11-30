import type { ProductType, Retailer, Province, PriceTrend } from './constants'

// Database types (matching Supabase schema)
export interface PriceSnapshot {
  id: string
  created_at: string
  retailer: string
  province: string
  product_type: string
  buy_price: number
  sell_price: number
  unit: string
  source_url?: string | null
}

// Application types (normalized)
export interface PriceData {
  id: string
  createdAt: string
  retailer: Retailer
  province: Province
  productType: ProductType
  buyPrice: number
  sellPrice: number
  unit: string
  sourceUrl?: string
  trend?: PriceTrend
  change?: number
  changePercent?: number
}

// API response types
export interface CurrentPricesResponse {
  data: PriceSnapshot[]
  timestamp: string
}

export interface HistoricalPricesResponse {
  data: PriceSnapshot[]
  timestamp: string
  interval: 'hourly' | 'daily' | 'weekly'
}

// Filter types
export interface PriceFilters {
  retailer?: Retailer
  province?: Province
  productType?: ProductType
}

export interface HistoricalFilters extends PriceFilters {
  startDate: Date
  endDate: Date
  interval?: 'hourly' | 'daily' | 'weekly'
}

// Chart data types
export interface ChartDataPoint {
  date: string
  buyPrice: number
  sellPrice: number
  retailer?: string
  province?: string
}

// Raw data from external API
export interface RawPriceData {
  retailer: string
  province: string
  product_type: string
  buy_price: number
  sell_price: number
  unit?: string
  source_url?: string
  timestamp?: string
}

// Price comparison types
export interface PriceComparison {
  productType: ProductType
  prices: Array<{
    retailer: Retailer
    province: Province
    buyPrice: number
    sellPrice: number
    spread: number
  }>
  bestBuyPrice: {
    retailer: Retailer
    province: Province
    price: number
  }
  bestSellPrice: {
    retailer: Retailer
    province: Province
    price: number
  }
}

// Error types
export interface APIError {
  message: string
  code?: string
  details?: unknown
}
