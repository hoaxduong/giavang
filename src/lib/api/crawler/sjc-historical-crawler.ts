import { SjcCrawler } from "./sjc-crawler";
import type { PriceData } from "@/lib/types";
import type { TypeMapping, Retailer, ProductType, Province } from "./types";
import {
  Retailer as RetailerLiteral,
  ProductType as ProductTypeLiteral,
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
export class SjcHistoricalCrawler extends SjcCrawler {
  /**
   * Fetch historical prices for a specific type
   *
   * Note: SJC API returns all types in one response, but we filter to match
   * the requested typeCode (TypeName) for compatibility with BackfillExecutor.
   *
   * @param typeCode - TypeName to filter for (e.g., "Vàng SJC 1L, 10L, 1KG")
   * @param days - Number of historical days to fetch (1-365)
   * @returns Historical price data with errors
   */
  async fetchHistoricalPrices(
    typeCode: string,
    days: number
  ): Promise<HistoricalCrawlerResult> {
    const startTime = Date.now();

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

      // Calculate date range (from today back N days)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days + 1); // Go back days-1 to include today

      // Format dates for SJC API (DD/MM/YYYY)
      const fromDate = this.formatDate(start);
      const toDate = this.formatDate(end);

      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];

      // Build form-urlencoded body
      const formBody = new URLSearchParams({
        method: "GetGoldPriceHistory",
        goldPriceId: "1", // SJC gold bars
        fromDate,
        toDate,
      }).toString();

      // Fetch from API
      const response = await fetch(
        this.config.apiUrl,
        this.createFetchOptions({
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "Mozilla/5.0",
          },
          body: formBody,
        })
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          data: [],
          errors: [
            {
              date: "",
              error: `HTTP ${response.status}: ${
                response.statusText
              } - ${errorText.substring(0, 200)}`,
            },
          ],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        return {
          success: false,
          data: [],
          errors: [
            {
              date: "",
              error: `Invalid content type: ${contentType}. Response: ${errorText.substring(
                0,
                200
              )}`,
            },
          ],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Parse JSON
      const data: SjcHistoricalResponse = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        return {
          success: false,
          data: [],
          errors: [
            { date: "", error: "No historical data in API response" },
          ],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Parse historical data and filter for requested type
      const { prices, errors } = await this.parseHistoricalResponse(
        data,
        typeCode,
        endDateStr
      );

      return {
        success: prices.length > 0,
        data: prices,
        errors,
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

    // Process each matching item (one per branch/province)
    for (const item of matchingItems) {
      try {
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

        prices.push({
          date: referenceDate,
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
            error instanceof Error
              ? error.message
              : "Unknown parsing error",
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
    dailyPrice: SjcDailyPriceData,
    mapping: TypeMapping,
    retailer: Retailer,
    province: Province,
    productType: ProductType
  ): PriceData {
    // Map branch name to province code (using the same logic as SjcCrawler)
    const provinceCode = this.mapBranchToProvince(dailyPrice.branchName);

    // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
    const buyPriceInChi = this.convertLuongToChi(dailyPrice.buyPrice);
    const sellPriceInChi = this.convertLuongToChi(dailyPrice.sellPrice);
    const changeInChi = dailyPrice.change
      ? this.convertLuongToChi(dailyPrice.change)
      : undefined;

    // Use the date from dailyPrice and set to midnight UTC
    return {
      id: "",
      createdAt: `${dailyPrice.date}T00:00:00.000Z`,
      retailer: mapping.retailerCode as unknown as RetailerLiteral,
      province: provinceCode as unknown as ProvinceLiteral,
      productType: mapping.productTypeCode as unknown as ProductTypeLiteral,
      buyPrice: buyPriceInChi,
      sellPrice: sellPriceInChi,
      unit: "VND/chi",
      change: changeInChi,
    };
  }

}
