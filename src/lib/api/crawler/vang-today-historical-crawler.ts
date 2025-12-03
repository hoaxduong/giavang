import { VangTodayCrawler } from "./vang-today-crawler";
import type { PriceData } from "@/lib/types";
import type { TypeMapping, Retailer, ProductType, Province } from "./types";
import {
  Retailer as RetailerLiteral,
  ProductType as ProductTypeLiteral,
  Province as ProvinceLiteral,
} from "@/lib/constants";

/**
 * API Response from vang.today historical endpoint
 */
interface VangTodayHistoricalResponse {
  success: boolean;
  days: number;
  type: string;
  history: Array<{
    date: string; // YYYY-MM-DD
    prices: Record<
      string,
      {
        name: string;
        buy: number;
        sell: number;
        day_change_buy: number;
        day_change_sell: number;
        updates: number;
        currency?: string;
      }
    >;
  }>;
}

/**
 * Daily price data extracted from historical response
 */
export interface DailyPriceData {
  date: string; // YYYY-MM-DD
  type: string; // External type code
  buyPrice: number;
  sellPrice: number;
  currency?: string;
  change?: number;
}

/**
 * Result from historical crawler fetch
 */
export interface HistoricalCrawlerResult {
  success: boolean;
  data: DailyPriceData[];
  errors: Array<{ date: string; error: string }>;
  metadata: {
    daysRequested: number;
    daysReturned: number;
    typeCode: string;
  };
}

/**
 * VangTodayHistoricalCrawler
 *
 * Extends VangTodayCrawler to fetch historical price data.
 * Supports fetching up to 30 days of historical data per gold type.
 */
export class VangTodayHistoricalCrawler extends VangTodayCrawler {
  /**
   * Fetch historical prices for a specific type
   *
   * @param typeCode - External type code (SJL1L10, XAUUSD, etc.)
   * @param days - Number of historical days to fetch (1-30)
   * @returns Historical price data with errors
   */
  async fetchHistoricalPrices(
    typeCode: string,
    days: number
  ): Promise<HistoricalCrawlerResult> {
    const startTime = Date.now();

    try {
      // Validate days parameter
      if (days < 1 || days > 30) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "Days must be between 1 and 30" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Build historical API URL
      const url = new URL(this.config.apiUrl);
      url.searchParams.set("type", typeCode);
      url.searchParams.set("days", days.toString());
      url.searchParams.set("action", "summary");

      // Fetch from API
      const response = await fetch(
        url.toString(),
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
      const data: VangTodayHistoricalResponse = await response.json();

      if (!data.success || !data.history || data.history.length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ date: "", error: "No historical data in API response" }],
          metadata: {
            daysRequested: days,
            daysReturned: 0,
            typeCode,
          },
        };
      }

      // Parse historical data
      const { prices, errors } = await this.parseHistoricalResponse(
        data,
        typeCode
      );

      return {
        success: prices.length > 0,
        data: prices,
        errors,
        metadata: {
          daysRequested: days,
          daysReturned: data.history.length,
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
   *
   * @param apiResponse - Raw API response
   * @param typeCode - External type code being processed
   * @returns Parsed price data and errors
   */
  private async parseHistoricalResponse(
    apiResponse: VangTodayHistoricalResponse,
    typeCode: string
  ): Promise<{
    prices: DailyPriceData[];
    errors: Array<{ date: string; error: string }>;
  }> {
    const prices: DailyPriceData[] = [];
    const errors: Array<{ date: string; error: string }> = [];

    // Process each day in the history
    for (const dayData of apiResponse.history) {
      try {
        const date = dayData.date;

        // Get price info for this type code
        const priceInfo = dayData.prices[typeCode];

        if (!priceInfo) {
          errors.push({
            date,
            error: `No price data for type ${typeCode} on this date`,
          });
          continue;
        }

        // Extract prices
        const buyPrice = priceInfo.buy;
        const sellPrice = priceInfo.sell;

        if (
          typeof buyPrice !== "number" ||
          typeof sellPrice !== "number" ||
          buyPrice <= 0 ||
          sellPrice <= 0
        ) {
          errors.push({
            date,
            error: "Invalid buy/sell prices",
          });
          continue;
        }

        prices.push({
          date,
          type: typeCode,
          buyPrice,
          sellPrice,
          currency: priceInfo.currency,
          change: priceInfo.day_change_buy,
        });
      } catch (error) {
        errors.push({
          date: dayData.date,
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
   * @param dailyPrice - Daily price data
   * @param mapping - Type mapping
   * @param retailer - Retailer entity
   * @param province - Province entity
   * @param productType - Product type entity
   * @returns PriceData formatted for database insertion
   */
  convertDailyToSnapshot(
    dailyPrice: DailyPriceData,
    mapping: TypeMapping,
    retailer: Retailer,
    province: Province,
    productType: ProductType
  ): PriceData {
    const typeCode = dailyPrice.type;

    // Handle XAUUSD separately (world gold in USD/oz)
    if (typeCode === "XAUUSD") {
      return {
        id: "",
        createdAt: `${dailyPrice.date}T00:00:00.000Z`, // Use date at midnight UTC
        retailer: mapping.retailerCode as unknown as RetailerLiteral,
        province: province.code as unknown as ProvinceLiteral,
        productType: mapping.productTypeCode as unknown as ProductTypeLiteral,
        buyPrice: dailyPrice.buyPrice,
        sellPrice: dailyPrice.sellPrice,
        unit: "USD/oz",
        change: dailyPrice.change,
      };
    }

    // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
    const buyPriceInChi = this.convertLuongToChi(dailyPrice.buyPrice);
    const sellPriceInChi = this.convertLuongToChi(dailyPrice.sellPrice);
    const changeInChi = dailyPrice.change
      ? this.convertLuongToChi(dailyPrice.change)
      : undefined;

    return {
      id: "",
      createdAt: `${dailyPrice.date}T00:00:00.000Z`, // Use date at midnight UTC
      retailer: mapping.retailerCode as unknown as RetailerLiteral,
      province: province.code as unknown as ProvinceLiteral,
      productType: mapping.productTypeCode as unknown as ProductTypeLiteral,
      buyPrice: buyPriceInChi,
      sellPrice: sellPriceInChi,
      unit: "VND/chi",
      change: changeInChi,
    };
  }
}
