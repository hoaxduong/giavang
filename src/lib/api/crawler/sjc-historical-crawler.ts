import { SjcCrawler } from "./sjc-crawler";
import { request } from "undici";
import type { PriceData } from "@/lib/types";
import type {
  TypeMapping,
  Retailer,
  Province,
  HistoricalCrawler,
  GenericHistoricalCrawlerResult,
  BaseDailyPriceData,
} from "./types";
import {
  Retailer as RetailerLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";

/**
 * API Response from SJC for historical data (same structure as current)
 */
interface SjcHistoricalResponse {
  success: boolean;
  latestDate: string;
  data: Array<{
    Id: number;
    TypeName: string;
    BranchName: string;
    Buy: string;
    BuyValue: number;
    Sell: string;
    SellValue: number;
    BuyDiffer: string | null;
    BuyDifferValue: number;
    SellDiffer: string | null;
    SellDifferValue: number;
    GroupDate: string;
  }>;
}

/**
 * Daily price data extracted from historical response
 * Note: For SJC, we use TypeName as the type identifier
 */
export interface SjcDailyPriceData {
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601 timestamp from GroupDate
  type: string; // TypeName from API (to match vang.today pattern)
  buyPrice: number; // VND per lượng
  sellPrice: number; // VND per lượng
  branchName: string; // BranchName from API (specific to SJC)
  change?: number; // Price difference
}

/**
 * Result from historical crawler fetch
 * Matches vang.today historical crawler result structure
 */
export interface HistoricalCrawlerResult {
  success: boolean;
  data: SjcDailyPriceData[];
  errors: Array<{ date: string; error: string }>;
  metadata: {
    daysRequested: number;
    daysReturned: number;
    typeCode: string;
  };
}

/**
 * SjcHistoricalCrawler
 *
 * Extends SjcCrawler to fetch historical price data.
 * Unlike vang.today which requires per-type requests, SJC returns all
 * product types in one response, making historical fetching simpler.
 */
export class SjcHistoricalCrawler
  extends SjcCrawler
  implements HistoricalCrawler
{
  /**
   * Fetch historical prices for a specific type
   *
   * Makes a single API call with a date range to fetch all historical data.
   * Filters the response to match the requested typeCode (TypeName).
   *
   * @param typeCode - TypeName to filter for (e.g., "Vàng SJC 1L, 10L, 1KG")
   * @param days - Number of historical days to fetch (1-365)
   * @returns Historical price data with errors
   */
  async fetchHistoricalPrices(
    typeCode: string,
    days: number
  ): Promise<GenericHistoricalCrawlerResult<SjcDailyPriceData>> {
    try {
      // Validate days parameter
      if (days < 1 || days > 365) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "Days must be between 1 and 365" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Calculate date range (fetch entire range in one API call)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);

      const fromDateFormatted = this.formatDate(startDate); // DD/MM/YYYY
      const toDateFormatted = this.formatDate(endDate); // DD/MM/YYYY

      // Build form-urlencoded body for date range
      const formBody = new URLSearchParams({
        method: "GetGoldPriceHistory",
        goldPriceId: "1",
        fromDate: fromDateFormatted,
        toDate: toDateFormatted,
      }).toString();

      const bodyBuffer = Buffer.from(formBody, "utf-8");

      // Fetch from API
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

      if (statusCode < 200 || statusCode >= 300) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: `HTTP ${statusCode}` }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Check content type
      const contentType = headers["content-type"] as string | undefined;
      if (
        !contentType ||
        (!contentType.includes("application/json") &&
          !contentType.includes("text/json"))
      ) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: `Invalid content type: ${contentType}` }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Parse JSON
      const data = (await body.json()) as SjcHistoricalResponse;

      if (!data.success || !data.data || data.data.length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "No data in API response" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Parse all prices from the date range response
      const { prices, errors } = await this.parseHistoricalResponse(
        data,
        typeCode,
        `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
      );

      return {
        success: prices.length > 0,
        data: prices,
        errors: errors,
        metadata: {
          daysRequested: days,
          daysReturned: prices.length,
          typeCode,
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
          typeCode,
        },
      };
    }
  }

  /**
   * Parse historical API response to DailyPriceData format
   * Filters for the requested typeCode (TypeName)
   *
   * @param apiResponse - Raw API response
   * @param typeCode - TypeName to filter for
   * @param referenceDate - Date to use for the prices (YYYY-MM-DD)
   * @returns Parsed price data and errors
   */
  private async parseHistoricalResponse(
    apiResponse: SjcHistoricalResponse,
    typeCode: string,
    referenceDate: string
  ): Promise<{
    prices: SjcDailyPriceData[];
    errors: Array<{ date: string; error: string }>;
  }> {
    const prices: SjcDailyPriceData[] = [];
    const errors: Array<{ date: string; error: string }> = [];

    // Filter and process items that match the requested typeCode
    const matchingItems = apiResponse.data.filter(
      (item) => item.TypeName === typeCode
    );

    if (matchingItems.length === 0) {
      errors.push({
        date: referenceDate,
        error: `No data found for type: ${typeCode}`,
      });
      return { prices, errors };
    }

    // Process all matching items
    for (const item of matchingItems) {
      try {
        // Map branch name to province code

        // Extract prices
        const buyPrice = item.BuyValue;
        const sellPrice = item.SellValue;

        if (
          typeof buyPrice !== "number" ||
          typeof sellPrice !== "number" ||
          buyPrice <= 0 ||
          sellPrice <= 0
        ) {
          errors.push({
            date: referenceDate,
            error: `Invalid buy/sell prices for ${item.TypeName} in ${item.BranchName}`,
          });
          continue;
        }

        // Parse timestamp from GroupDate
        let timestamp: string;
        try {
          timestamp = this.parseDotNetDate(item.GroupDate);
        } catch (error) {
          errors.push({
            date: referenceDate,
            error: `Failed to parse GroupDate: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          continue;
        }

        prices.push({
          date: referenceDate,
          timestamp,
          type: item.TypeName,
          branchName: item.BranchName,
          buyPrice,
          sellPrice,
          change: item.BuyDifferValue !== 0 ? item.BuyDifferValue : undefined,
        });
      } catch (error) {
        errors.push({
          date: referenceDate,
          error:
            error instanceof Error ? error.message : "Unknown parsing error",
        });
      }
    }

    return { prices, errors };
  }

  /**
   * Convert DailyPriceData to PriceData format
   * Performs the same mapping lookups and unit conversions as the current crawler
   *
   * Note: For SJC, we need to map the branchName to a province code
   *
   * @param dailyPrice - Daily price data
   * @param mapping - Type mapping
   * @param retailer - Retailer entity (not used, kept for signature compatibility)
   * @param province - Province entity (not used, kept for signature compatibility)
   * @param productType - Product type entity (not used, kept for signature compatibility)
   * @returns PriceData formatted for database insertion
   */
  convertDailyToSnapshot(
    dailyPrice: BaseDailyPriceData,
    mapping: TypeMapping,
    _retailer: Retailer,
    _province: Province
  ): PriceData {
    const sjcPrice = dailyPrice as SjcDailyPriceData;
    // Map branch name to province code (using the same logic as SjcCrawler)
    const provinceCode = this.mapBranchToProvince(sjcPrice.branchName);

    // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
    const buyPriceInChi = this.convertLuongToChi(sjcPrice.buyPrice);
    const sellPriceInChi = this.convertLuongToChi(sjcPrice.sellPrice);
    const changeInChi = sjcPrice.change
      ? this.convertLuongToChi(sjcPrice.change)
      : undefined;

    // Use the timestamp from API response (parsed from GroupDate)
    return {
      id: "",
      createdAt: sjcPrice.timestamp,
      retailer: mapping.retailerCode as unknown as RetailerLiteral,
      province: provinceCode as unknown as ProvinceLiteral,
      productName: mapping.label,
      retailerProductId: mapping.retailerProductId,
      buyPrice: buyPriceInChi,
      sellPrice: sellPriceInChi,
      unit: "VND/chi",
      change: changeInChi,
    };
  }
}
