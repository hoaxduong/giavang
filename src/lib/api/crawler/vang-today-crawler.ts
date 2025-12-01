import { BaseCrawler } from "./base-crawler";
import { crawlerLogger } from "./logger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  CrawlerResult,
  TypeMapping,
  Retailer,
  ProductType,
  Province,
} from "./types";
import type {
  Retailer as RetailerLiteral,
  ProductType as ProductTypeLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";
import type { PriceData } from "@/lib/types";

/**
 * API Response from vang.today
 */
interface VangTodayResponse {
  success: boolean;
  timestamp: number;
  time: string;
  date: string;
  count: number;
  prices: Record<
    string,
    {
      name: string;
      buy: number;
      sell: number;
      change_buy: number;
      change_sell: number;
      currency: string;
    }
  >;
}

/**
 * VangToday Crawler
 *
 * Fetches gold prices from vang.today API and converts them to internal format.
 * - Uses database-driven type mappings (no hardcoded mappings)
 * - Respects enable/disable flags at multiple levels
 * - Comprehensive logging of all operations
 */
export class VangTodayCrawler extends BaseCrawler {
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
   * Fetch prices from vang.today API
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

      // Fetch from API
      const response = await fetch(
        this.config.apiUrl,
        this.createFetchOptions({
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0",
          },
        })
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: response.status,
          responseTimeMs: responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
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
            responseStatus: response.status,
          },
        };
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: response.status,
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
            responseStatus: response.status,
          },
        };
      }

      // Parse JSON
      const data: VangTodayResponse = await response.json();

      if (
        !data.success ||
        !data.prices ||
        Object.keys(data.prices).length === 0
      ) {
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "GET",
          responseStatus: response.status,
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
            responseStatus: response.status,
          },
        };
      }

      // Parse prices with database mappings
      const { prices, errors } = await this.parsePrices(data);

      const recordsFetched = Object.keys(data.prices).length;
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
        responseStatus: response.status,
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
          responseStatus: response.status,
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
          errorStack: errorObj.stack,
        });
      }

      throw errorObj;
    }
  }

  /**
   * Parse vang.today API response to PriceData format
   * Uses database-driven type mappings and respects enable/disable flags
   */
  private async parsePrices(apiResponse: VangTodayResponse): Promise<{
    prices: PriceData[];
    errors: Array<{ item: string; error: string }>;
  }> {
    const prices: PriceData[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    // Fetch all enabled mappings, retailers, provinces, product types
    const { mappings, retailers, provinces, productTypes } =
      await this.fetchReferenceData();

    // Create lookup maps for fast access
    const mappingMap = new Map<string, TypeMapping>();
    mappings.forEach((m) => mappingMap.set(m.externalCode, m));

    const retailerMap = new Map<string, Retailer>();
    retailers.forEach((r) => retailerMap.set(r.code, r));

    const provinceMap = new Map<string, Province>();
    provinces.forEach((p) => provinceMap.set(p.code, p));

    const productTypeMap = new Map<string, ProductType>();
    productTypes.forEach((pt) => productTypeMap.set(pt.code, pt));

    const timestamp = new Date(apiResponse.timestamp * 1000).toISOString();

    // Parse each price entry
    for (const [typeCode, priceInfo] of Object.entries(apiResponse.prices)) {
      try {
        const mapping = mappingMap.get(typeCode);

        // Skip if no mapping or mapping disabled
        if (!mapping || !mapping.isEnabled) {
          errors.push({
            item: typeCode,
            error: "No enabled mapping found",
          });
          continue;
        }

        // Check if retailer is enabled
        const retailer = retailerMap.get(mapping.retailerCode);
        if (!retailer || !retailer.isEnabled) {
          errors.push({
            item: typeCode,
            error: `Retailer ${mapping.retailerCode} is disabled`,
          });
          continue;
        }

        // Check if product type is enabled
        const productType = productTypeMap.get(mapping.productTypeCode);
        if (!productType || !productType.isEnabled) {
          errors.push({
            item: typeCode,
            error: `Product type ${mapping.productTypeCode} is disabled`,
          });
          continue;
        }

        // Get province (may be null in mapping)
        const provinceCode = mapping.provinceCode || "TP. Hồ Chí Minh";
        const province = provinceMap.get(provinceCode);
        if (!province || !province.isEnabled) {
          // Use default province if specified one is disabled
          const defaultProvince = provinceMap.get("TP. Hồ Chí Minh");
          if (!defaultProvince || !defaultProvince.isEnabled) {
            errors.push({
              item: typeCode,
              error: `Province ${provinceCode} is disabled and default province unavailable`,
            });
            continue;
          }
        }

        // Handle XAUUSD separately (world gold in USD/oz)
        if (typeCode === "XAUUSD") {
          prices.push({
            id: "",
            createdAt: timestamp,
            retailer: mapping.retailerCode as unknown as RetailerLiteral,
            province: provinceCode as unknown as ProvinceLiteral,
            productType:
              mapping.productTypeCode as unknown as ProductTypeLiteral,
            buyPrice: priceInfo.buy,
            sellPrice: priceInfo.sell,
            unit: "USD/oz",
            change: priceInfo.change_buy || undefined,
          });
          continue;
        }

        // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
        const buyPriceInChi = this.convertLuongToChi(priceInfo.buy);
        const sellPriceInChi = this.convertLuongToChi(priceInfo.sell);

        prices.push({
          id: "",
          createdAt: timestamp,
          retailer: mapping.retailerCode as unknown as RetailerLiteral,
          province: provinceCode as unknown as ProvinceLiteral,
          productType: mapping.productTypeCode as unknown as ProductTypeLiteral,
          buyPrice: buyPriceInChi,
          sellPrice: sellPriceInChi,
          unit: "VND/chi",
          change: priceInfo.change_buy
            ? this.convertLuongToChi(priceInfo.change_buy)
            : undefined,
        });
      } catch (error) {
        errors.push({
          item: typeCode,
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
    productTypes: ProductType[];
  }> {
    const supabase = createServiceRoleClient();

    // Fetch all reference data in parallel
    const [
      mappingsResult,
      retailersResult,
      provincesResult,
      productTypesResult,
    ] = await Promise.all([
      supabase
        .from("crawler_type_mappings")
        .select("*")
        .eq("source_id", this.config.id)
        .eq("is_enabled", true),
      supabase.from("retailers").select("*").eq("is_enabled", true),
      supabase.from("provinces").select("*").eq("is_enabled", true),
      supabase.from("product_types").select("*").eq("is_enabled", true),
    ]);

    const mappings: TypeMapping[] =
      mappingsResult.data?.map((m) => ({
        id: m.id,
        sourceId: m.source_id,
        externalCode: m.external_code,
        retailerCode: m.retailer_code,
        productTypeCode: m.product_type_code,
        provinceCode: m.province_code,
        label: m.label,
        isEnabled: m.is_enabled,
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

    const productTypes: ProductType[] =
      productTypesResult.data?.map((pt) => ({
        id: pt.id,
        code: pt.code,
        label: pt.label,
        shortLabel: pt.short_label,
        isEnabled: pt.is_enabled,
        sortOrder: pt.sort_order,
      })) || [];

    return { mappings, retailers, provinces, productTypes };
  }

  /**
   * Convert price from VND/lượng to VND/chi
   * 1 lượng = 10 chỉ
   */
  private convertLuongToChi(priceInLuong: number): number {
    return Math.round(priceInLuong / 10);
  }
}
