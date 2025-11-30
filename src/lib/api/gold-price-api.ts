import type { ProductType, Province, Retailer } from "../constants";
import type { PriceData } from "../types";

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
 * Type code mapping for vang.today API
 * Maps vang.today type codes to internal product types and retailers
 */
const TYPE_CODE_MAPPING: Record<
  string,
  { productType: ProductType; retailer: Retailer; label: string }
> = {
  XAUUSD: {
    productType: "GOLD_9999", // World gold, using GOLD_9999 as closest match
    retailer: "SJC", // Default retailer for world gold
    label: "Vàng Thế Giới (XAU/USD)",
  },
  SJL1L10: {
    productType: "SJC_BARS",
    retailer: "SJC",
    label: "Vàng SJC 1 lượng 10 chỉ",
  },
  SJ9999: {
    productType: "SJC_RINGS",
    retailer: "SJC",
    label: "Vàng nhẫn SJC 99.99",
  },
  DOHNL: {
    productType: "GOLD_9999",
    retailer: "DOJI",
    label: "DOJI Hà Nội",
  },
  DOHCML: {
    productType: "GOLD_9999",
    retailer: "DOJI",
    label: "DOJI HCM",
  },
  DOJINHTV: {
    productType: "GOLD_9999",
    retailer: "DOJI",
    label: "DOJI Nữ Trang",
  },
  BTSJC: {
    productType: "SJC_BARS",
    retailer: "Bảo Tín Minh Châu",
    label: "Bảo Tín SJC",
  },
  BT9999NTT: {
    productType: "GOLD_9999",
    retailer: "Bảo Tín Minh Châu",
    label: "Bảo Tín 9999",
  },
  PQHNVM: {
    productType: "SJC_BARS",
    retailer: "PNJ",
    label: "PNJ Hà Nội",
  },
  PQHN24NTT: {
    productType: "GOLD_24K",
    retailer: "PNJ",
    label: "PNJ 24K",
  },
  VNGSJC: {
    productType: "SJC_BARS",
    retailer: "SJC",
    label: "VN Gold SJC",
  },
  VIETTINMSJC: {
    productType: "SJC_BARS",
    retailer: "SJC",
    label: "Viettin SJC",
  },
  // Legacy mappings for backward compatibility
  SJHNL1L10: {
    productType: "SJC_BARS",
    retailer: "SJC",
    label: "Vàng SJC HN 1 lượng",
  },
  DOJI9999: {
    productType: "GOLD_9999",
    retailer: "DOJI",
    label: "Vàng DOJI 99.99",
  },
  PNJL1L10: {
    productType: "SJC_BARS",
    retailer: "PNJ",
    label: "Vàng PNJ 1 lượng",
  },
  PNJ9999: {
    productType: "GOLD_9999",
    retailer: "PNJ",
    label: "Vàng PNJ 99.99",
  },
  BTMC9999: {
    productType: "GOLD_9999",
    retailer: "Bảo Tín Minh Châu",
    label: "Vàng Bảo Tín Minh Châu 99.99",
  },
};

/**
 * Province inference from type codes
 * Some type codes contain location hints (e.g., DOHNL = DOJI Hà Nội)
 */
function inferProvinceFromTypeCode(typeCode: string): Province {
  const provinceMap: Record<string, Province> = {
    DOHNL: "Hà Nội", // DOJI Hà Nội
    DOHCML: "TP. Hồ Chí Minh", // DOJI HCM
    PQHNVM: "Hà Nội", // PNJ Hà Nội
    SJHNL1L10: "Hà Nội", // SJC Hà Nội
  };

  return provinceMap[typeCode] || "TP. Hồ Chí Minh";
}

/**
 * Convert price from VND/lượng to VND/chi
 * 1 lượng = 10 chỉ
 */
function convertLuongToChi(priceInLuong: number): number {
  return Math.round(priceInLuong / 10);
}

/**
 * Gold Price API Client for vang.today
 *
 * API Documentation: https://www.vang.today/vi/api
 *
 * Features:
 * - Public API, no authentication required
 * - Aggregated data from multiple gold retailers
 * - Simple JSON response format
 * - Real-time price updates (every 5 minutes)
 */
export class GoldPriceAPI {
  private apiUrl: string;

  constructor() {
    this.apiUrl =
      process.env.GOLD_PRICE_API_URL || "https://www.vang.today/api/prices";
  }

  /**
   * Fetch current gold prices from vang.today API
   * This should only be called from the server-side cron job
   */
  async getCurrentPrices(): Promise<PriceData[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(
          `vang.today API error: ${response.status} ${response.statusText}`,
          text.substring(0, 200)
        );
        return this.getMockData();
      }

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.warn(
          `vang.today API returned non-JSON response. Content-Type: ${contentType}`,
          text.substring(0, 200)
        );
        return this.getMockData();
      }

      const data: VangTodayResponse = await response.json();

      if (!data.success || !data.prices || Object.keys(data.prices).length === 0) {
        console.warn("No data from vang.today API, using mock data as fallback");
        return this.getMockData();
      }

      // Parse and convert to PriceData format
      const prices: PriceData[] = [];
      const timestamp = new Date(data.timestamp * 1000).toISOString();

      // Iterate over the prices object (keys are type codes)
      for (const [typeCode, priceInfo] of Object.entries(data.prices)) {
        const mapping = TYPE_CODE_MAPPING[typeCode];

        // Skip unknown type codes (except XAUUSD which we handle specially)
        if (!mapping && typeCode !== "XAUUSD") {
          console.warn(`Unknown type code: ${typeCode}`);
          continue;
        }

        // Infer province from type code
        const province = inferProvinceFromTypeCode(typeCode);

        // Handle XAUUSD separately (world gold in USD/oz)
        if (typeCode === "XAUUSD") {
          // For world gold, store it in the database with USD/oz unit
          // No conversion needed - price is already in USD/oz
          const xauusdMapping = TYPE_CODE_MAPPING["XAUUSD"];
          prices.push({
            id: "",
            createdAt: timestamp,
            retailer: xauusdMapping.retailer,
            province: "TP. Hồ Chí Minh", // Default province for world gold
            productType: xauusdMapping.productType,
            buyPrice: priceInfo.buy, // Already in USD/oz
            sellPrice: priceInfo.sell, // Already in USD/oz
            unit: "USD/oz",
            // Include change information if available
            change: priceInfo.change_buy || undefined,
          });
          continue;
        }

        // Convert from VND/lượng to VND/chi (1 lượng = 10 chỉ)
        const buyPriceInChi = convertLuongToChi(priceInfo.buy);
        const sellPriceInChi = convertLuongToChi(priceInfo.sell);

        prices.push({
          id: "",
          createdAt: timestamp,
          retailer: mapping.retailer,
          province,
          productType: mapping.productType,
          buyPrice: buyPriceInChi,
          sellPrice: sellPriceInChi,
          unit: "VND/chi",
          // Include change information if available
          change: priceInfo.change_buy ? convertLuongToChi(priceInfo.change_buy) : undefined,
        });
      }

      // If no prices were parsed, use mock data as fallback
      if (prices.length === 0) {
        console.warn("No prices parsed from API response, using mock data");
        return this.getMockData();
      }

      return prices;
    } catch (error) {
      console.error("Failed to fetch current prices from vang.today:", error);
      // Fallback to mock data on error
      return this.getMockData();
    }
  }

  /**
   * Fetch prices for a specific retailer (public method)
   */
  async getPricesByRetailer(retailer: string): Promise<PriceData[]> {
    const allPrices = await this.getCurrentPrices();
    return allPrices.filter((price) => price.retailer === retailer);
  }

  /**
   * Fetch prices for a specific province (public method)
   */
  async getPricesByProvince(province: string): Promise<PriceData[]> {
    const allPrices = await this.getCurrentPrices();
    return allPrices.filter((price) => price.province === province);
  }

  /**
   * Mock data for development/testing
   * Used when API is unavailable or for testing
   */
  private getMockData(): PriceData[] {
    const basePrice = 76500000; // Base price in VND/lượng
    const basePriceInChi = convertLuongToChi(basePrice); // Convert to VND/chi
    const timestamp = new Date().toISOString();

    return [
      {
        id: "1",
        createdAt: timestamp,
        retailer: "SJC",
        province: "TP. Hồ Chí Minh",
        productType: "SJC_BARS",
        buyPrice: basePriceInChi,
        sellPrice: basePriceInChi + 30000, // 300,000 VND/lượng = 30,000 VND/chi
        unit: "VND/chi",
      },
      {
        id: "2",
        createdAt: timestamp,
        retailer: "SJC",
        province: "Hà Nội",
        productType: "SJC_BARS",
        buyPrice: basePriceInChi + 5000, // 50,000 VND/lượng = 5,000 VND/chi
        sellPrice: basePriceInChi + 35000,
        unit: "VND/chi",
      },
      {
        id: "3",
        createdAt: timestamp,
        retailer: "DOJI",
        province: "TP. Hồ Chí Minh",
        productType: "SJC_BARS",
        buyPrice: basePriceInChi - 10000,
        sellPrice: basePriceInChi + 20000,
        unit: "VND/chi",
      },
      {
        id: "4",
        createdAt: timestamp,
        retailer: "PNJ",
        province: "TP. Hồ Chí Minh",
        productType: "SJC_RINGS",
        buyPrice: basePriceInChi - 20000,
        sellPrice: basePriceInChi + 10000,
        unit: "VND/chi",
      },
      {
        id: "5",
        createdAt: timestamp,
        retailer: "SJC",
        province: "Đà Nẵng",
        productType: "SJC_BARS",
        buyPrice: basePriceInChi + 10000,
        sellPrice: basePriceInChi + 40000,
        unit: "VND/chi",
      },
      {
        id: "6",
        createdAt: timestamp,
        retailer: "DOJI",
        province: "Hà Nội",
        productType: "SJC_BARS",
        buyPrice: basePriceInChi - 5000,
        sellPrice: basePriceInChi + 25000,
        unit: "VND/chi",
      },
    ];
  }
}

/**
 * Singleton instance
 */
export const goldPriceAPI = new GoldPriceAPI();
