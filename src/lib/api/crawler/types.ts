import type { PriceData } from "@/lib/types";

/**
 * Field mapping configuration for parsing API responses
 */
export interface FieldMappings {
  /** Path to the prices array in API response (e.g., "data.prices") */
  dataPath: string;
  /** Mapping of internal field names to API field names */
  fields: {
    typeCode: string; // API field for external type code
    buyPrice: string; // API field for buy price
    sellPrice: string; // API field for sell price
    timestamp: string; // API field for timestamp
    currency?: string; // Optional: API field for currency
  };
  /** Optional transformations to apply to the data */
  transforms?: {
    timestamp?: "iso8601" | "unix"; // Timestamp format
    priceMultiplier?: number; // Multiply prices by this value
  };
}

/**
 * Crawler configuration from database
 */
export interface CrawlerConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiType: string;
  headers?: Record<string, string>;
  timeout?: number;
  isEnabled: boolean;
  rateLimit?: number;
  priority?: number;
  fieldMappings?: FieldMappings;
  retailerFilter?: string[] | null; // ["SJC", "PNJ"] or null for all
}

/**
 * Type mapping from external API code to internal entities
 */
export interface TypeMapping {
  id: string;
  sourceId: string;
  externalCode: string;
  retailerCode: string;
  // provinceCode removed
  label: string;
  isEnabled: boolean;
  retailerProductId: string; // Link to retailer_products table (mandatory after migration 027)
}

/**
 * Reference data entities
 */
export interface Retailer {
  id: string;
  code: string;
  name: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface Province {
  id: string;
  code: string;
  name: string;
  isEnabled: boolean;
  sortOrder: number;
}

/**
 * Result from a crawler fetch operation
 */
export interface CrawlerResult {
  success: boolean;
  data: PriceData[];
  metadata: {
    recordsFetched: number;
    recordsSaved: number;
    recordsFailed: number;
    responseTime: number;
    responseStatus: number;
  };
  errors?: Array<{
    item: string;
    error: string;
  }>;
}

/**
 * Multi-source sync result
 */
export interface SyncResult {
  results: Array<{
    source: string;
    success: boolean;
    recordsSaved: number;
    error?: string;
  }>;
  totalRecords: number;
  totalErrors: number;
  duration: number;
}

/**
 * Crawler log entry for database
 */
export interface CrawlerLogEntry {
  sourceId: string | null;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "partial_success" | "failed";
  recordsFetched: number;
  recordsSaved: number;
  recordsFailed: number;
  requestUrl?: string;
  requestMethod?: string;
  responseStatus?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  errorStack?: string;
  failedItems?: Array<{ item: string; error: string }>;
  triggerType: "manual" | "cron" | "api";
  triggerUserId?: string;
}

/**
 * Database entities (snake_case from Supabase)
 */
export interface DbCrawlerSource {
  id: string;
  name: string;
  api_url: string;
  api_type: string;
  is_enabled: boolean;
  headers?: Record<string, string>;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  rate_limit_per_minute?: number;
  timeout_seconds?: number;
  priority?: number;
  field_mappings?: FieldMappings;
  created_at: string;
  updated_at: string;
}

export interface DbTypeMapping {
  id: string;
  source_id: string;
  external_code: string;
  retailer_code: string;
  // province_code removed
  label: string;
  is_enabled: boolean;
  retailer_product_id: string; // Mandatory after migration 027
  created_at: string;
  updated_at: string;
}

export interface DbRetailer {
  id: string;
  code: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProvince {
  id: string;
  code: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Converter functions from database to application types
 */
export function dbSourceToConfig(db: DbCrawlerSource): CrawlerConfig {
  return {
    id: db.id,
    name: db.name,
    apiUrl: db.api_url,
    apiType: db.api_type,
    headers: db.headers,
    timeout: db.timeout_seconds ? db.timeout_seconds * 1000 : undefined,
    isEnabled: db.is_enabled,
    rateLimit: db.rate_limit_per_minute,
    priority: db.priority,
    fieldMappings: db.field_mappings,
  };
}

export function dbTypeMappingToTypeMapping(db: DbTypeMapping): TypeMapping {
  return {
    id: db.id,
    sourceId: db.source_id,
    externalCode: db.external_code,
    retailerCode: db.retailer_code,
    label: db.label,
    isEnabled: db.is_enabled,
    retailerProductId: db.retailer_product_id,
  };
}

export function dbRetailerToRetailer(db: DbRetailer): Retailer {
  return {
    id: db.id,
    code: db.code,
    name: db.name,
    isEnabled: db.is_enabled,
    sortOrder: db.sort_order,
  };
}

export function dbProvinceToProvince(db: DbProvince): Province {
  return {
    id: db.id,
    code: db.code,
    name: db.name,
    isEnabled: db.is_enabled,
    sortOrder: db.sort_order,
  };
}

/**
 * Zone mapping for Onus crawler
 */
export interface ZoneMapping {
  id: string;
  sourceId: string;
  zoneText: string;
  provinceCode: string;
  isEnabled: boolean;
}

export interface DbZoneMapping {
  id: string;
  source_id: string;
  zone_text: string;
  province_code: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function dbZoneMappingToZoneMapping(db: DbZoneMapping): ZoneMapping {
  return {
    id: db.id,
    sourceId: db.source_id,
    zoneText: db.zone_text,
    provinceCode: db.province_code,
    isEnabled: db.is_enabled,
  };
}

/**
 * Onus API Response Interfaces
 */

// Response from /golds endpoint
export interface OnusGoldsResponse {
  data: Array<{
    type: string; // Product name
    buy: number; // Buy price in VND
    sell: number; // Sell price in VND
    slug: string; // URL-friendly identifier
    source: string; // 'sjc', 'pnj', 'doji', etc.
    timestamp: number; // Unix milliseconds
    disable: boolean; // Availability flag
    changeBuy: number; // Price change for buy
    changeSell: number; // Price change for sell
    zone?: {
      value: string; // Zone code
      text: string; // Zone name (e.g., "Hồ Chí Minh")
    };
  }>;
}

// Response from /line endpoint
export interface OnusLineResponse {
  data: Array<{
    buy: number; // Bid price
    sell: number; // Ask price
    ts: number; // Unix milliseconds
  }>;
}

// Response from /golds/sources endpoint
export interface OnusSourcesResponse {
  data: Array<{
    slug: string; // URL-friendly identifier
    name: string; // Abbreviated name
    fullName: string; // Complete official name
  }>;
}

// Daily price data for historical crawler
export interface OnusDailyPriceData {
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  slug: string;
  buyPrice: number;
  sellPrice: number;
  change?: number;
}

/**
 * Base generic interface for daily price data
 * Used by BackfillExecutor to handle different crawler implementations
 */
export interface BaseDailyPriceData {
  date: string;
  timestamp: string;
  [key: string]: any; // Allow other properties
}

/**
 * Generic result from historical crawler fetch
 */
export interface GenericHistoricalCrawlerResult<
  T extends BaseDailyPriceData = BaseDailyPriceData,
> {
  success: boolean;
  data: T[];
  errors: Array<{ date: string; error: string }>;
  metadata: {
    daysRequested: number;
    daysReturned: number;
    [key: string]: any;
  };
}

/**
 * Common interface for all historical crawlers
 */
export interface HistoricalCrawler {
  /**
   * Fetch historical prices for a specific type/slug
   */
  fetchHistoricalPrices(
    identifier: string,
    days: number
  ): Promise<GenericHistoricalCrawlerResult>;

  /**
   * Convert specific daily price data to standardized PriceData
   */
  convertDailyToSnapshot(
    dailyPrice: BaseDailyPriceData,
    mapping: TypeMapping,
    retailer: Retailer
  ): PriceData;
}
