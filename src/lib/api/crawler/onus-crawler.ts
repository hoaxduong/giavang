import { BaseCrawler } from "./base-crawler";
import { crawlerLogger } from "./logger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { request } from "undici";
import type {
  CrawlerResult,
  TypeMapping,
  Retailer,
  Province,
  ZoneMapping,
  OnusGoldsResponse,
  OnusLineResponse,
} from "./types";
import type {
  Retailer as RetailerLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";
import type { PriceData, RetailerProduct } from "@/lib/types";

/**
 * Retailer source normalization map
 * Maps API source field to internal retailer codes
 */
const SOURCE_TO_RETAILER: Record<string, string> = {
  sjc: "SJC",
  pnj: "PNJ",
  doji: "DOJI",
  btmc: "Bảo Tín Minh Châu",
  phuquy: "Phú Quý",
  btmh: "BTMH",
  mihong: "Mi Hồng",
  ngoctham: "Ngọc Thẩm",
};

/**
 * Onus Crawler
 *
 * Fetches gold prices from Onus Exchange API and converts them to internal format.
 * - Supports multiple retailers with optional filtering
 * - Maps zone text to province codes using database mappings
 * - Uses slug as external code for type mappings
 * - Respects enable/disable flags at multiple levels
 * - Comprehensive logging of all operations
 */
export class OnusCrawler extends BaseCrawler {
  private triggerType: "manual" | "cron" | "api" = "cron";
  private triggerUserId?: string;

  /**
   * Set trigger information for logging
   */
  setTriggerInfo(type: "manual" | "cron" | "api", userId?: string) {
    this.triggerType = type;
    this.triggerUserId = userId;
  }

  /**
   * Fetch prices from Onus API
   */
  async fetchPrices(): Promise<CrawlerResult> {
    const startTime = Date.now();
    let logId: string | null = null;

    try {
      // Create log entry
      logId = await crawlerLogger.createLog(
        this.config.id,
        this.triggerType,
        this.triggerUserId
      );

      // Fetch from API using undici
      const timeout = this.config.timeout || 30000;

      const { statusCode, headers, body } = await request(this.config.apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; GoldPriceApp/1.0)",
          ...this.config.headers,
        },
        bodyTimeout: timeout,
        headersTimeout: timeout,
      });

      const responseTime = Date.now() - startTime;

      // Check status code
      if (statusCode < 200 || statusCode >= 300) {
        const errorText = await body.text();
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: statusCode,
          responseTimeMs: responseTime,
          errorMessage: `HTTP ${statusCode}`,
          errorStack: errorText.substring(0, 1000),
        });

        return {
          success: false,
          data: [],
          metadata: {
            recordsFetched: 0,
            recordsSaved: 0,
            recordsFailed: 0,
            responseTime,
            responseStatus: statusCode,
          },
        };
      }

      // Check content type
      const contentType = headers["content-type"] as string | undefined;
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await body.text();
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: statusCode,
          responseTimeMs: responseTime,
          errorMessage: `Invalid content type: ${contentType}`,
          errorStack: errorText.substring(0, 1000),
        });

        return {
          success: false,
          data: [],
          metadata: {
            recordsFetched: 0,
            recordsSaved: 0,
            recordsFailed: 0,
            responseTime,
            responseStatus: statusCode,
          },
        };
      }

      // Parse JSON
      const data = (await body.json()) as OnusGoldsResponse;

      if (!data.data || data.data.length === 0) {
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: statusCode,
          responseTimeMs: responseTime,
          errorMessage: "No data in API response",
        });

        return {
          success: false,
          data: [],
          metadata: {
            recordsFetched: 0,
            recordsSaved: 0,
            recordsFailed: 0,
            responseTime,
            responseStatus: statusCode,
          },
        };
      }

      // Parse prices with database mappings
      const { prices, errors } = await this.parsePrices(data);

      // Also fetch XAU/USD from /line endpoint
      try {
        const xauusdPrice = await this.fetchXAUUSD();
        if (xauusdPrice) {
          prices.push(xauusdPrice);
        }
      } catch (error) {
        errors.push({
          item: "xauusd",
          error:
            error instanceof Error ? error.message : "Failed to fetch XAU/USD",
        });
      }

      const recordsFetched = data.data.length + 1; // +1 for XAU/USD attempt
      const recordsSaved = prices.length;
      const recordsFailed = errors.length;

      // Determine status
      let status: "success" | "partial_success" | "failed";
      if (recordsSaved === 0) {
        status = "failed";
      } else if (errors.length > 0) {
        status = "partial_success";
      } else {
        status = "success";
      }

      // Update log
      await crawlerLogger.updateLog(logId, {
        status,
        recordsFetched,
        recordsSaved,
        recordsFailed,
        requestUrl: this.config.apiUrl,
        requestMethod: "GET",
        responseStatus: statusCode,
        responseTimeMs: responseTime,
        failedItems: errors.length > 0 ? errors : undefined,
        errorMessage:
          errors.length > 0
            ? `${errors.length} items failed to parse`
            : undefined,
      });

      return {
        success: status !== "failed",
        data: prices,
        metadata: {
          recordsFetched,
          recordsSaved,
          recordsFailed,
          responseTime,
          responseStatus: statusCode,
        },
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const errorObj = this.handleFetchError(error);

      if (logId) {
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseTimeMs: responseTime,
          errorMessage: errorObj.message,
          errorStack:
            errorObj.stack ||
            JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
      }

      throw errorObj;
    }
  }

  /**
   * Parse Onus API response to PriceData format
   * Uses database-driven type mappings and respects enable/disable flags
   */
  private async parsePrices(apiResponse: OnusGoldsResponse): Promise<{
    prices: PriceData[];
    errors: Array<{ item: string; error: string }>;
  }> {
    const prices: PriceData[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    // Fetch all enabled mappings, retailers, provinces, retailer products, zone mappings
    const { mappings, retailers, provinces, retailerProducts, zoneMappings } =
      await this.fetchReferenceData();

    // Create lookup maps for fast access
    const mappingMap = new Map<string, TypeMapping>();
    mappings.forEach((m) => mappingMap.set(m.externalCode, m));

    const retailerMap = new Map<string, Retailer>();
    retailers.forEach((r) => retailerMap.set(r.code, r));

    const provinceMap = new Map<string, Province>();
    provinces.forEach((p) => provinceMap.set(p.code, p));

    const retailerProductMap = new Map<string, RetailerProduct>();
    retailerProducts.forEach((rp) => retailerProductMap.set(rp.id, rp));

    const zoneMappingMap = new Map<string, ZoneMapping>();
    zoneMappings.forEach((zm) => zoneMappingMap.set(zm.zoneText, zm));

    // Parse each price entry
    for (const item of apiResponse.data) {
      try {
        // Skip if disabled
        if (item.disable) {
          continue;
        }

        // Check retailer filter
        if (!this.shouldIncludeRetailer(item.source)) {
          continue;
        }

        // Use slug as external code
        const externalCode = item.slug;
        const mapping = mappingMap.get(externalCode);

        // Skip if no mapping or mapping disabled
        if (!mapping || !mapping.isEnabled) {
          errors.push({
            item: `${item.slug} (${item.source})`,
            error: "No enabled mapping found",
          });
          continue;
        }

        // Map source to retailer code
        const retailerCode = this.mapSourceToRetailer(item.source);
        const retailer = retailerMap.get(retailerCode);

        // For XAU/USD, skip retailer validation since it uses empty retailer
        // For other items, check if retailer is enabled
        if (mapping.externalCode !== "xauusd") {
          if (!retailer || !retailer.isEnabled) {
            errors.push({
              item: `${item.slug} (${item.source})`,
              error: `Retailer ${retailerCode} is disabled or not found`,
            });
            continue;
          }
        }

        // Check if retailer product is enabled
        const retailerProduct = retailerProductMap.get(
          mapping.retailerProductId
        );
        if (!retailerProduct || !retailerProduct.isEnabled) {
          errors.push({
            item: `${item.slug} (${item.source})`,
            error: `Retailer product is disabled or not found`,
          });
          continue;
        }

        // Determine province code
        let provinceCode: string;
        // Map zone to province
        provinceCode = this.mapZoneToProvince(
          item.zone?.text || null,
          zoneMappingMap
        );

        const province = provinceMap.get(provinceCode);

        // Only check enabled status if a specific province is assigned
        if (provinceCode && (!province || !province.isEnabled)) {
          errors.push({
            item: `${item.slug} (${item.source})`,
            error: `Province ${provinceCode} is disabled or not found`,
          });
          continue;
        }

        // Extract price values
        const buyPrice = item.buy;
        const sellPrice = item.sell;

        if (
          typeof buyPrice !== "number" ||
          typeof sellPrice !== "number" ||
          buyPrice <= 0 ||
          sellPrice <= 0
        ) {
          errors.push({
            item: `${item.slug} (${item.source})`,
            error: "Invalid buy/sell prices",
          });
          continue;
        }

        // Convert Unix milliseconds to ISO timestamp
        const timestamp = new Date(item.timestamp).toISOString();

        // Calculate change if available
        const change = item.changeBuy !== 0 ? item.changeBuy : undefined;

        // For XAU/USD, use empty retailer; otherwise use mapped retailer
        const finalRetailerCode =
          mapping.externalCode === "xauusd" ? "" : retailerCode;

        prices.push({
          id: "",
          createdAt: timestamp,
          retailer: finalRetailerCode as unknown as RetailerLiteral,
          province: provinceCode as unknown as ProvinceLiteral,

          productName: mapping.label, // Store specific product name from mapping
          retailerProductId: mapping.retailerProductId, // Link to retailer_products (mandatory)
          buyPrice,
          sellPrice,
          unit: mapping.externalCode === "xauusd" ? "USD/oz" : "VND/chi",
          change,
        });
      } catch (error) {
        errors.push({
          item: `${item.slug} (${item.source})`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { prices, errors };
  }

  /**
   * Fetch reference data from database
   * Only returns enabled items
   */
  private async fetchReferenceData(): Promise<{
    mappings: TypeMapping[];
    retailers: Retailer[];
    provinces: Province[];
    retailerProducts: RetailerProduct[];
    zoneMappings: ZoneMapping[];
  }> {
    const supabase = createServiceRoleClient();

    // Fetch all reference data in parallel
    const [
      mappingsResult,
      retailersResult,
      provincesResult,
      retailerProductsResult,
      zoneMappingsResult,
    ] = await Promise.all([
      supabase
        .from("crawler_type_mappings")
        .select("*")
        .eq("source_id", this.config.id)
        .eq("is_enabled", true),
      supabase.from("retailers").select("*").eq("is_enabled", true),
      supabase.from("provinces").select("*").eq("is_enabled", true),
      supabase.from("retailer_products").select("*").eq("is_enabled", true),
      supabase
        .from("zone_mappings")
        .select("*")
        .eq("source_id", this.config.id)
        .eq("is_enabled", true),
    ]);

    const mappings: TypeMapping[] =
      mappingsResult.data?.map((m) => ({
        id: m.id,
        sourceId: m.source_id,
        externalCode: m.external_code,
        retailerCode: m.retailer_code,
        provinceCode: m.province_code,
        label: m.label,
        isEnabled: m.is_enabled,
        retailerProductId: m.retailer_product_id, // Mandatory after migration 027
      })) || [];

    const retailers: Retailer[] =
      retailersResult.data?.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isEnabled: r.is_enabled,
        sortOrder: r.sort_order,
      })) || [];

    const provinces: Province[] =
      provincesResult.data?.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        isEnabled: p.is_enabled,
        sortOrder: p.sort_order,
      })) || [];

    const retailerProducts: RetailerProduct[] =
      retailerProductsResult.data?.map((rp) => ({
        id: rp.id,
        retailerCode: rp.retailer_code,
        productCode: rp.product_code,
        productName: rp.product_name,

        description: rp.description,
        isEnabled: rp.is_enabled,
        sortOrder: rp.sort_order,
        metadata: rp.metadata,
        createdAt: rp.created_at,
        updatedAt: rp.updated_at,
      })) || [];

    const zoneMappings: ZoneMapping[] =
      zoneMappingsResult.data?.map((zm) => ({
        id: zm.id,
        sourceId: zm.source_id,
        zoneText: zm.zone_text,
        provinceCode: zm.province_code,
        isEnabled: zm.is_enabled,
      })) || [];

    return { mappings, retailers, provinces, retailerProducts, zoneMappings };
  }

  /**
   * Map API source field to internal retailer code
   */
  protected mapSourceToRetailer(source: string): string {
    return SOURCE_TO_RETAILER[source.toLowerCase()] || source.toUpperCase();
  }

  /**
   * Map zone text to province code
   * Uses zone mappings from database with fallback to default province
   */
  protected mapZoneToProvince(
    zoneText: string | null,
    zoneMappings: Map<string, ZoneMapping>
  ): string {
    if (!zoneText) {
      return ""; // Default province
    }

    const mapping = zoneMappings.get(zoneText);
    if (mapping && mapping.isEnabled) {
      return mapping.provinceCode;
    }

    // Fallback to default province (empty string)
    return "";
  }

  /**
   * Check if retailer should be included based on filter configuration
   */
  protected shouldIncludeRetailer(source: string): boolean {
    // If no filter configured, include all retailers
    if (
      !this.config.retailerFilter ||
      this.config.retailerFilter.length === 0
    ) {
      return true;
    }

    // Map source to retailer code and check if it's in the filter
    const retailerCode = this.mapSourceToRetailer(source);
    return this.config.retailerFilter.includes(retailerCode);
  }

  /**
   * Fetch XAU/USD price from /line endpoint
   * Returns a PriceData object or null if not available
   */
  private async fetchXAUUSD(): Promise<PriceData | null> {
    const supabase = createServiceRoleClient();

    // Get the type mapping for xauusd
    const { data: mapping } = await supabase
      .from("crawler_type_mappings")
      .select("*")
      .eq("source_id", this.config.id)
      .eq("external_code", "xauusd")
      .eq("is_enabled", true)
      .single();

    if (!mapping) {
      return null; // No mapping configured
    }

    // Fetch from /line endpoint
    const lineUrl = this.config.apiUrl.replace("/golds", "/line?slug=xauusd");
    const { statusCode, body } = await request(lineUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; GoldPriceApp/1.0)",
      },
      bodyTimeout: this.config.timeout || 30000,
      headersTimeout: this.config.timeout || 30000,
    });

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`HTTP ${statusCode}`);
    }

    const data = (await body.json()) as OnusLineResponse;

    if (!data.data || data.data.length === 0) {
      return null;
    }

    // Get the latest price (last item in array)
    const latest = data.data[data.data.length - 1];

    return {
      id: "",
      createdAt: new Date(latest.ts).toISOString(),
      retailer: "" as unknown as RetailerLiteral,
      province: "" as unknown as ProvinceLiteral,
      productName: mapping.label,
      retailerProductId: mapping.retailer_product_id,
      buyPrice: latest.buy,
      sellPrice: latest.sell,
      unit: "USD/oz",
      change: undefined,
    };
  }
}
