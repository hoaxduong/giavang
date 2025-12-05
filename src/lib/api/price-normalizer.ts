import type {
  RawPriceData,
  PriceData,
  PriceSnapshot,
  EnrichedPriceSnapshot,
} from "../types";
import type { Retailer, Province } from "../constants";

/**
 * Normalize raw price data from external API to application format
 */
export function normalizePriceData(raw: RawPriceData): PriceData {
  return {
    id: "", // Will be set after inserting to database
    createdAt: raw.timestamp || new Date().toISOString(),
    retailer: raw.retailer as Retailer,
    province: raw.province as Province,
    buyPrice: raw.buy_price,
    sellPrice: raw.sell_price,
    unit: raw.unit || "VND/chi",
    sourceUrl: raw.source_url,
  };
}

/**
 * Convert database snapshot to application format
 */
export function snapshotToPriceData(
  snapshot: EnrichedPriceSnapshot
): PriceData {
  return {
    id: snapshot.id,
    createdAt: snapshot.created_at,
    retailer: snapshot.retailer as Retailer,
    province: snapshot.province as Province,
    productName: snapshot.product_name || undefined,
    retailerProductId: snapshot.retailer_product_id || undefined,
    buyPrice: Number(snapshot.buy_price),
    sellPrice: Number(snapshot.sell_price),
    unit: snapshot.unit,
    sourceUrl: snapshot.source_url || undefined,
  };
}

/**
 * Convert application format to database insert format
 */
export function priceDataToSnapshot(
  data: PriceData
): Omit<PriceSnapshot, "id" | "created_at"> {
  return {
    // retailer is removed from db
    province: data.province,
    // product_name is removed from db
    retailer_product_id: data.retailerProductId || null,
    buy_price: data.buyPrice,
    sell_price: data.sellPrice,
    unit: data.unit,
    source_url: data.sourceUrl || null,
  };
}

/**
 * Convert database retailer product to application format
 */
export function dbRetailerProductToRetailerProduct(
  db: import("../types").DbRetailerProduct
): import("../types").RetailerProduct {
  return {
    id: db.id,
    retailerCode: db.retailer_code,
    productCode: db.product_code,
    productName: db.product_name,
    description: db.description,
    isEnabled: db.is_enabled,
    sortOrder: db.sort_order,
    metadata: db.metadata,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
