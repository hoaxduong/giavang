import { OnusCrawler } from "./onus-crawler";
import { request } from "undici";
import type { PriceData } from "@/lib/types";
import type {
  TypeMapping,
  Retailer,
  ProductType,
  Province,
  OnusLineResponse,
  OnusDailyPriceData,
} from "./types";
import {
  Retailer as RetailerLiteral,
  ProductType as ProductTypeLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";

/**
 * Result from historical crawler fetch
 */
export interface HistoricalCrawlerResult {
  success: boolean;
  data: OnusDailyPriceData[];
  errors: Array<{ date: string; error: string }>;
  metadata: {
    daysRequested: number;
    daysReturned: number;
    slug: string;
  };
}

/**
 * OnusHistoricalCrawler
 *
 * Extends OnusCrawler to fetch historical price data from Onus /line endpoint.
 * Fetches time-series data for a specific product slug.
 */
export class OnusHistoricalCrawler extends OnusCrawler {
  /**
   * Fetch historical prices for a specific slug
   *
   * Makes an API call to the /line endpoint to fetch historical data
   * for the specified product slug.
   *
   * @param slug - Product slug (e.g., "nhan-tron-9999-hung-thinh-vuong")
   * @param days - Number of historical days to fetch (informational, API returns all available)
   * @returns Historical price data with errors
   */
  async fetchHistoricalPrices(
    slug: string,
    days: number = 365
  ): Promise<HistoricalCrawlerResult> {
    try {
      // Validate slug parameter
      if (!slug || slug.trim().length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "Slug is required" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            slug,
          },
        };
      }

      // Build API URL with slug and interval parameters
      const baseUrl = this.config.apiUrl.replace("/golds", "/line");
      const url = `${baseUrl}?slug=${encodeURIComponent(slug)}&interval=1M`;

      // Fetch from API
      const timeout = this.config.timeout || 30000;
      const { statusCode, headers, body } = await request(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; GoldPriceApp/1.0)",
          ...this.config.headers,
        },
        bodyTimeout: timeout,
        headersTimeout: timeout,
      });

      if (statusCode < 200 || statusCode >= 300) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: `HTTP ${statusCode}` }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            slug,
          },
        };
      }

      // Check content type
      const contentType = headers["content-type"] as string | undefined;
      if (!contentType || !contentType.includes("application/json")) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: `Invalid content type: ${contentType}` }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            slug,
          },
        };
      }

      // Parse JSON
      const data = (await body.json()) as OnusLineResponse;

      if (!data.data || data.data.length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "No data in API response" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            slug,
          },
        };
      }

      // Parse historical response
      const { prices, errors } = await this.parseHistoricalResponse(data, slug);

      return {
        success: prices.length > 0,
        data: prices,
        errors: errors,
        metadata: {
          daysRequested: days,
          daysReturned: prices.length,
          slug,
        },
      };
    } catch (error) {
      const errorObj = this.handleFetchError(error);
      return {
        success: false,
        data: [],
        errors: [{ date: "", error: errorObj.message }],
        metadata: {
          daysRequested: days,
          daysReturned: 0,
          slug,
        },
      };
    }
  }

  /**
   * Parse historical API response to OnusDailyPriceData format
   *
   * @param apiResponse - Raw API response from /line endpoint
   * @param slug - Product slug
   * @returns Parsed price data and errors
   */
  private async parseHistoricalResponse(
    apiResponse: OnusLineResponse,
    slug: string
  ): Promise<{
    prices: OnusDailyPriceData[];
    errors: Array<{ date: string; error: string }>;
  }> {
    const prices: OnusDailyPriceData[] = [];
    const errors: Array<{ date: string; error: string }> = [];

    // Process all data points
    for (const item of apiResponse.data) {
      try {
        // Extract prices
        const buyPrice = item.buy;
        const sellPrice = item.sell;
        const ts = item.ts;

        if (
          typeof buyPrice !== "number" ||
          typeof sellPrice !== "number" ||
          buyPrice <= 0 ||
          sellPrice <= 0
        ) {
          errors.push({
            date: new Date(ts).toISOString().split("T")[0],
            error: `Invalid buy/sell prices for ${slug}`,
          });
          continue;
        }

        // Convert Unix milliseconds to ISO timestamp
        const timestamp = new Date(ts).toISOString();
        const date = timestamp.split("T")[0]; // YYYY-MM-DD

        prices.push({
          date,
          timestamp,
          slug,
          buyPrice,
          sellPrice,
          change: undefined, // Historical data doesn't include change
        });
      } catch (error) {
        errors.push({
          date: "",
          error:
            error instanceof Error ? error.message : "Unknown parsing error",
        });
      }
    }

    return { prices, errors };
  }

  /**
   * Convert OnusDailyPriceData to PriceData format
   * Uses the same mapping lookups as the current crawler
   *
   * @param dailyPrice - Daily price data
   * @param mapping - Type mapping
   * @param retailer - Retailer entity
   * @param province - Province entity
   * @param productType - Product type entity
   * @returns PriceData formatted for database insertion
   */
  convertDailyToSnapshot(
    dailyPrice: OnusDailyPriceData,
    mapping: TypeMapping,
    retailer: Retailer,
    province: Province,
    productType: ProductType
  ): PriceData {
    // Use mapping's retailer, province, and product type
    const retailerCode = mapping.retailerCode;
    const provinceCode = mapping.provinceCode || province.code;
    const productTypeCode = mapping.productTypeCode;

    // Use the timestamp from API response
    return {
      id: "",
      createdAt: dailyPrice.timestamp,
      retailer: retailerCode as unknown as RetailerLiteral,
      province: provinceCode as unknown as ProvinceLiteral,
      productType: productTypeCode as unknown as ProductTypeLiteral,
      productName: mapping.label, // Store specific product name from mapping
      retailerProductId: mapping.retailerProductId || undefined, // Link to retailer_products
      buyPrice: dailyPrice.buyPrice,
      sellPrice: dailyPrice.sellPrice,
      unit: "VND/chi",
      change: dailyPrice.change,
    };
  }
}
