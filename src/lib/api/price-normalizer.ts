import type { RawPriceData, PriceData, PriceSnapshot } from '../types'
import type { Retailer, Province, ProductType } from '../constants'

/**
 * Normalize raw price data from external API to application format
 */
export function normalizePriceData(raw: RawPriceData): PriceData {
  return {
    id: '', // Will be set after inserting to database
    createdAt: raw.timestamp || new Date().toISOString(),
    retailer: raw.retailer as Retailer,
    province: raw.province as Province,
    productType: raw.product_type as ProductType,
    buyPrice: raw.buy_price,
    sellPrice: raw.sell_price,
    unit: raw.unit || 'VND/chi',
    sourceUrl: raw.source_url,
  }
}

/**
 * Convert database snapshot to application format
 */
export function snapshotToPriceData(snapshot: PriceSnapshot): PriceData {
  return {
    id: snapshot.id,
    createdAt: snapshot.created_at,
    retailer: snapshot.retailer as Retailer,
    province: snapshot.province as Province,
    productType: snapshot.product_type as ProductType,
    buyPrice: Number(snapshot.buy_price),
    sellPrice: Number(snapshot.sell_price),
    unit: snapshot.unit,
    sourceUrl: snapshot.source_url || undefined,
  }
}

/**
 * Convert application format to database insert format
 */
export function priceDataToSnapshot(data: PriceData): Omit<PriceSnapshot, 'id' | 'created_at'> {
  return {
    retailer: data.retailer,
    province: data.province,
    product_type: data.productType,
    buy_price: data.buyPrice,
    sell_price: data.sellPrice,
    unit: data.unit,
    source_url: data.sourceUrl || null,
  }
}
