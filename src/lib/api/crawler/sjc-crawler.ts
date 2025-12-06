import { BaseCrawler } from "./base-crawler";
import { crawlerLogger } from "./logger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { request } from "undici";
import type { CrawlerResult, TypeMapping, Retailer, Province } from "./types";
import type {
  Retailer as RetailerLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";
import type { PriceData, RetailerProduct } from "@/lib/types";

/**
 * API Response from SJC
 */
interface SjcResponse {
  success: boolean;
  latestDate: string; // "HH:mm DD/MM/YYYY"
  data: Array<{
    Id: number;
    TypeName: string;
    BranchName: string;
    Buy: string; // Formatted string with comma separator
    BuyValue: number; // Numeric value in VND per lượng
    Sell: string; // Formatted string with comma separator
    SellValue: number; // Numeric value in VND per lượng
    BuyDiffer: string | null;
    BuyDifferValue: number;
    SellDiffer: string | null;
    SellDifferValue: number;
    GroupDate: string; // .NET date serialization (unused)
  }>;
}

/**
 * Branch name to province code mapping
 * Handles both specific cities and regional names
 */
const BRANCH_TO_PROVINCE: Record<string, string> = {
  // Direct city mappings
  "Hồ Chí Minh": "TP. Hồ Chí Minh",
  "Hà Nội": "Hà Nội",
  "Hải Phòng": "Hải Phòng",
  "Hạ Long": "Quảng Ninh",
  Huế: "Thừa Thiên Huế",
  "Quảng Ngãi": "Quảng Ngãi",
  "Nha Trang": "Khánh Hòa",
  "Biên Hòa": "Đồng Nai",
  "Bạc Liêu": "Bạc Liêu",
  "Cà Mau": "Cà Mau",
  "Đà Nẵng": "Đà Nẵng",
  "Cần Thơ": "Cần Thơ",

  // Regional mappings (map to representative city)
  "Miền Bắc": "Hà Nội",
  "Miền Trung": "Đà Nẵng",
  "Miền Tây": "Cần Thơ",
};

/**
 * SJC Crawler
 *
 * Fetches gold prices from SJC API and converts them to internal format.
 * - Uses database-driven type mappings (TypeName as external code)
 * - Maps BranchName to province codes
 * - Respects enable/disable flags at multiple levels
 * - Comprehensive logging of all operations
 * - POST request with form-urlencoded body
 */
export class SjcCrawler extends BaseCrawler {
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
   * Parse .NET date serialization format
   * Converts "/Date(1764811673890)/" to ISO 8601 string
   *
   * @param groupDate - .NET date string from API
   * @returns ISO 8601 timestamp string
   */
  protected parseDotNetDate(groupDate: string): string {
    // Extract timestamp from /Date(timestamp)/
    const match = groupDate.match(/\/Date\((\d+)\)\//);
    if (!match) {
      throw new Error(`Invalid .NET date format: ${groupDate}`);
    }

    const timestamp = parseInt(match[1], 10);
    return new Date(timestamp).toISOString();
  }

  /**
   * Fetch prices from SJC API
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

      // Format today's date for SJC API (DD/MM/YYYY)
      const today = this.formatDate(new Date());

      // Build form-urlencoded body
      const formBody = new URLSearchParams({
        method: "GetGoldPriceHistory",
        goldPriceId: "1", // SJC gold bars
        fromDate: today,
        toDate: today,
      }).toString();

      // Convert to Buffer for proper content-length handling
      const bodyBuffer = Buffer.from(formBody, "utf-8");

      // Fetch from API using undici for better control
      const timeout = this.config.timeout || 30000;

      const { statusCode, headers, body } = await request(this.config.apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Content-Length": String(bodyBuffer.length),
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        },
        body: bodyBuffer,
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
          requestMethod: "POST",
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

      // Check content type (SJC returns "text/json" instead of "application/json")
      const contentType = headers["content-type"] as string | undefined;
      if (
        !contentType ||
        (!contentType.includes("application/json") &&
          !contentType.includes("text/json"))
      ) {
        const errorText = await body.text();
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "POST",
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
      const data = (await body.json()) as SjcResponse;

      if (!data.success || !data.data || data.data.length === 0) {
        await crawlerLogger.updateLog(logId, {
          status: "failed",
          recordsFetched: 0,
          recordsSaved: 0,
          recordsFailed: 0,
          requestUrl: this.config.apiUrl,
          requestMethod: "POST",
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

      const recordsFetched = data.data.length;
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
        requestMethod: "POST",
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
          requestMethod: "POST",
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
   * Parse SJC API response to PriceData format
   * Uses database-driven type mappings and respects enable/disable flags
   */
  private async parsePrices(apiResponse: SjcResponse): Promise<{
    prices: PriceData[];
    errors: Array<{ item: string; error: string }>;
  }> {
    const prices: PriceData[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    // Fetch all enabled mappings, retailers, provinces, retailer products
    const { mappings, retailers, provinces, retailerProducts } =
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

    // Parse each price entry
    for (const item of apiResponse.data) {
      try {
        // Use TypeName as external code
        const externalCode = item.TypeName;
        const mapping = mappingMap.get(externalCode);

        // Skip if no mapping or mapping disabled
        if (!mapping || !mapping.isEnabled) {
          errors.push({
            item: `${externalCode} (${item.BranchName})`,
            error: "No enabled mapping found",
          });
          continue;
        }

        // Check if retailer is enabled
        const retailer = retailerMap.get(mapping.retailerCode);
        if (!retailer || !retailer.isEnabled) {
          errors.push({
            item: `${externalCode} (${item.BranchName})`,
            error: `Retailer ${mapping.retailerCode} is disabled`,
          });
          continue;
        }

        // Check if retailer product is enabled
        const retailerProduct = retailerProductMap.get(
          mapping.retailerProductId
        );
        if (!retailerProduct || !retailerProduct.isEnabled) {
          errors.push({
            item: `${externalCode} (${item.BranchName})`,
            error: `Retailer product is disabled or not found`,
          });
          continue;
        }

        // Map BranchName to province code
        const provinceCode = this.mapBranchToProvince(item.BranchName);
        const province = provinceMap.get(provinceCode);

        // Only check enabled status if a specific province is assigned
        if (provinceCode && (!province || !province.isEnabled)) {
          errors.push({
            item: `${externalCode} (${item.BranchName})`,
            error: `Province ${provinceCode} is disabled or not found`,
          });
          continue;
        }

        // Extract price values (use BuyValue/SellValue, not the formatted strings)
        const buyPrice = item.BuyValue;
        const sellPrice = item.SellValue;

        if (
          typeof buyPrice !== "number" ||
          typeof sellPrice !== "number" ||
          buyPrice <= 0 ||
          sellPrice <= 0
        ) {
          errors.push({
            item: `${externalCode} (${item.BranchName})`,
            error: "Invalid buy/sell prices",
          });
          continue;
        }

        // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
        const buyPriceInChi = this.convertLuongToChi(buyPrice);
        const sellPriceInChi = this.convertLuongToChi(sellPrice);

        // Calculate change if differ values are available
        const change =
          item.BuyDifferValue !== 0
            ? this.convertLuongToChi(item.BuyDifferValue)
            : undefined;

        // Parse timestamp from GroupDate for precise per-item timestamps
        let timestamp: string;
        try {
          timestamp = this.parseDotNetDate(item.GroupDate);
        } catch (error) {
          // Fallback to current time if GroupDate parsing fails
          console.warn(
            `[SJC Crawler] Failed to parse GroupDate for ${externalCode}:`,
            error instanceof Error ? error.message : error
          );
          timestamp = new Date().toISOString();
        }

        prices.push({
          id: "",
          createdAt: timestamp,
          retailer: mapping.retailerCode as unknown as RetailerLiteral,
          province: provinceCode as unknown as ProvinceLiteral,

          productName: mapping.label, // Store specific product name from mapping
          retailerProductId: mapping.retailerProductId, // Link to retailer_products (mandatory)
          buyPrice: buyPriceInChi,
          sellPrice: sellPriceInChi,
          unit: "VND/chi",
          change,
        });
      } catch (error) {
        errors.push({
          item: `${item.TypeName} (${item.BranchName})`,
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
  protected async fetchReferenceData(): Promise<{
    mappings: TypeMapping[];
    retailers: Retailer[];
    provinces: Province[];
    retailerProducts: RetailerProduct[];
  }> {
    const supabase = createServiceRoleClient();

    // Fetch all reference data in parallel
    const [
      mappingsResult,
      retailersResult,
      provincesResult,
      retailerProductsResult,
    ] = await Promise.all([
      supabase
        .from("crawler_type_mappings")
        .select("*")
        .eq("source_id", this.config.id)
        .eq("is_enabled", true),
      supabase.from("retailers").select("*").eq("is_enabled", true),
      supabase.from("provinces").select("*").eq("is_enabled", true),
      supabase.from("retailer_products").select("*").eq("is_enabled", true),
    ]);

    const mappings: TypeMapping[] =
      mappingsResult.data?.map((m) => ({
        id: m.id,
        sourceId: m.source_id,
        externalCode: m.external_code,
        retailerCode: m.retailer_code,
        // provinceCode removed
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

    return { mappings, retailers, provinces, retailerProducts };
  }

  /**
   * Convert price from VND/lượng to VND/chi
   * 1 lượng = 10 chỉ
   */
  protected convertLuongToChi(priceInLuong: number): number {
    return Math.round(priceInLuong / 10);
  }

  /**
   * Map SJC branch name to province code
   * Uses predefined mapping with fallback to default province
   */
  protected mapBranchToProvince(branchName: string): string {
    return BRANCH_TO_PROVINCE[branchName] || "";
  }

  /**
   * Format date for SJC API (DD/MM/YYYY)
   */
  protected formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Parse SJC timestamp format "HH:mm DD/MM/YYYY" to ISO string
   */
  private parseTimestamp(sjcTimestamp: string | undefined): string {
    try {
      // Handle undefined or empty timestamp
      if (!sjcTimestamp) {
        console.warn(
          "[SJC Crawler] Timestamp is undefined, using current time"
        );
        return new Date().toISOString();
      }

      // Example: "13:07 04/12/2025"
      const match = sjcTimestamp.match(
        /(\d{2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})/
      );
      if (!match) {
        console.warn(
          "[SJC Crawler] Failed to parse timestamp format:",
          sjcTimestamp
        );
        return new Date().toISOString();
      }

      const [, hours, minutes, day, month, year] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );

      return date.toISOString();
    } catch (error) {
      console.error("Failed to parse SJC timestamp:", sjcTimestamp, error);
      return new Date().toISOString();
    }
  }
}
