import type { PriceData } from '../types'
import type { Retailer, Province, ProductType } from '../constants'

/**
 * API Response from vang.today
 */
interface VangTodayResponse {
  success: boolean
  current_time: number
  data: Array<{
    type_code: string
    buy: number
    sell: number
    change_buy: number
    change_sell: number
    update_time: number
  }>
}

/**
 * Type code mapping for vang.today API
 */
const TYPE_CODE_MAPPING: Record<
  string,
  { productType: ProductType; retailer: Retailer; label: string }
> = {
  SJL1L10: {
    productType: 'SJC_BARS',
    retailer: 'SJC',
    label: 'Vàng SJC 1 lượng 10 chỉ',
  },
  SJ9999: {
    productType: 'SJC_RINGS',
    retailer: 'SJC',
    label: 'Vàng nhẫn SJC 99.99',
  },
  SJHNL1L10: {
    productType: 'SJC_BARS',
    retailer: 'SJC',
    label: 'Vàng SJC HN 1 lượng',
  },
  DOJI9999: {
    productType: 'GOLD_9999',
    retailer: 'DOJI',
    label: 'Vàng DOJI 99.99',
  },
  PNJL1L10: {
    productType: 'SJC_BARS',
    retailer: 'PNJ',
    label: 'Vàng PNJ 1 lượng',
  },
  PNJ9999: {
    productType: 'GOLD_9999',
    retailer: 'PNJ',
    label: 'Vàng PNJ 99.99',
  },
  BTMC9999: {
    productType: 'GOLD_9999',
    retailer: 'Bảo Tín Minh Châu',
    label: 'Vàng Bảo Tín Minh Châu 99.99',
  },
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
 * - Real-time price updates
 */
export class GoldPriceAPI {
  private apiUrl: string

  constructor() {
    this.apiUrl =
      process.env.GOLD_PRICE_API_URL || 'https://www.vang.today/vi/api'
  }

  /**
   * Get current valid API key from database
   * Automatically requests new key if none exists or if expired
   */
  private async getApiKey(): Promise<string | null> {
    try {
      // Return cached key if still valid
      if (this.cachedApiKey && this.cacheExpiry && new Date() < this.cacheExpiry) {
        return this.cachedApiKey
      }

      const supabase = createServiceRoleClient()

      // Try to get current valid key from database
      const { data, error } = await supabase.rpc('get_current_api_key', {
        p_provider: 'vnappmob',
        p_scope: 'gold',
      })

      if (error) {
        console.error('Failed to fetch API key from database:', error)
        return null
      }

      // If we have a valid key, cache it
      if (data && data.length > 0) {
        const keyInfo = data[0] as ApiKeyInfo

        // Check if key is expiring soon (less than 3 days)
        if (keyInfo.days_until_expiry < 3) {
          console.warn(
            `API key expiring in ${keyInfo.days_until_expiry} days. Requesting new key...`
          )
          await this.requestNewApiKey()
          // Recursively call to get the new key
          return this.getApiKey()
        }

        // Cache the key (cache for 1 hour to reduce database queries)
        this.cachedApiKey = keyInfo.api_key
        this.cacheExpiry = new Date(Date.now() + 60 * 60 * 1000)

        return keyInfo.api_key
      }

      // No valid key found, request a new one
      console.log('No valid API key found. Requesting new key...')
      await this.requestNewApiKey()

      // Try again after requesting
      return this.getApiKey()
    } catch (error) {
      console.error('Error getting API key:', error)
      return null
    }
  }

  /**
   * Request a new API key from vnappmob
   */
  private async requestNewApiKey(): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/vnappmob-key`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('Failed to request new API key:', response.status)
        return
      }

      const result = await response.json()
      console.log('New API key requested:', result.message)

      // Clear cache to force refetch
      this.cachedApiKey = null
      this.cacheExpiry = null
    } catch (error) {
      console.error('Error requesting new API key:', error)
    }
  }

  /**
   * Fetch current gold prices from vnappmob API
   * This should only be called from the server-side cron job
   * Automatically manages API keys from database
   */
  async getCurrentPrices(): Promise<PriceData[]> {
    try {
      // Get current API key from database (auto-refreshes if needed)
      const apiKey = await this.getApiKey()

      if (!apiKey) {
        console.warn(
          'No API key available. Using mock data. Request key at: https://api.vnappmob.com/api/request_api_key?scope=gold'
        )
        return this.getMockData()
      }

      // Fetch from all retailers in parallel
      const [sjcData] = await Promise.all([
        this.fetchRetailerPrices('sjc', 'SJC', apiKey),
      ])

      // Combine all prices
      const allPrices = [...sjcData]

      // If no data fetched, use mock data as fallback
      if (allPrices.length === 0) {
        console.warn('No data from API, using mock data as fallback')
        return this.getMockData()
      }

      return allPrices
    } catch (error) {
      console.error('Failed to fetch current prices:', error)
      // Fallback to mock data on error
      return this.getMockData()
    }
  }

  /**
   * Fetch prices for a specific retailer
   */
  private async fetchRetailerPrices(
    endpoint: string,
    retailerName: string,
    apiKey: string
  ): Promise<PriceData[]> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }

      const response = await fetch(`${this.apiUrl}/api/v2/gold/${endpoint}`, {
        method: 'GET',
        headers,
        next: { revalidate: 300 }, // Cache for 5 minutes
      })

      if (!response.ok) {
        console.warn(`API error for ${retailerName}: ${response.status}`)
        return []
      }

      const data: VnappmobResponse = await response.json()

      // Parse and normalize the response
      return this.parseRetailerResponse(data, retailerName)
    } catch (error) {
      console.error(`Failed to fetch ${retailerName} prices:`, error)
      return []
    }
  }

  /**
   * Parse retailer response and convert to PriceData format
   */
  private parseRetailerResponse(
    response: VnappmobResponse,
    retailer: string
  ): PriceData[] {
    if (!response.results || response.results.length === 0) {
      return []
    }

    const prices: PriceData[] = []
    const timestamp = new Date().toISOString()

    // Process each result item
    for (const item of response.results) {
      // Extract buy/sell price pairs from the response
      const priceEntries = this.extractPriceEntries(item, retailer)

      for (const entry of priceEntries) {
        prices.push({
          id: '',
          createdAt: timestamp,
          retailer: entry.retailer,
          province: entry.province,
          productType: entry.productType,
          buyPrice: entry.buyPrice,
          sellPrice: entry.sellPrice,
          unit: 'VND/chi',
        })
      }
    }

    return prices
  }

  /**
   * Extract price entries from API response
   * Handles different field naming conventions for each retailer
   */
  private extractPriceEntries(
    item: Record<string, number | string>,
    retailer: string
  ): Array<{
    retailer: Retailer
    province: Province
    productType: ProductType
    buyPrice: number
    sellPrice: number
  }> {
    const entries: Array<{
      retailer: Retailer
      province: Province
      productType: ProductType
      buyPrice: number
      sellPrice: number
    }> = []

    // Map location codes to province names
    const locationMap: Record<string, string> = {
      hcm: 'TP. Hồ Chí Minh',
      hn: 'Hà Nội',
      dn: 'Đà Nẵng',
      ct: 'Cần Thơ',
    }

    // SJC format: buy_1l, sell_1l, buy_05l, sell_05l, etc.
    // DOJI format: buy_hcm, sell_hcm, buy_hn, sell_hn, etc.
    // PNJ format: buy_hcm, sell_hcm, etc.

    const keys = Object.keys(item)

    // Group buy/sell pairs
    const buyKeys = keys.filter(k => k.startsWith('buy_'))

    for (const buyKey of buyKeys) {
      const suffix = buyKey.replace('buy_', '')
      const sellKey = `sell_${suffix}`

      if (item[sellKey] !== undefined) {
        const buyPrice = Number(item[buyKey])
        const sellPrice = Number(item[sellKey])

        // Determine product type and province from suffix
        let productType: ProductType = 'SJC_BARS'
        let province: Province = 'TP. Hồ Chí Minh'

        if (suffix === '1l' || suffix === 'sjc') {
          productType = 'SJC_BARS'
        } else if (suffix.includes('nhan') || suffix.includes('ring')) {
          productType = 'SJC_RINGS'
        } else if (suffix === '9999' || suffix === 'gold_9999') {
          productType = 'GOLD_9999'
        } else if (locationMap[suffix]) {
          // Location-based pricing
          province = locationMap[suffix] as Province
        }

        // For location-based keys (DOJI, PNJ)
        if (locationMap[suffix]) {
          province = locationMap[suffix] as Province
        }

        entries.push({
          retailer: retailer as Retailer,
          province,
          productType,
          buyPrice,
          sellPrice,
        })
      }
    }

    // If no entries found, try alternative parsing
    if (entries.length === 0 && item.buy && item.sell) {
      entries.push({
        retailer: retailer as Retailer,
        province: 'TP. Hồ Chí Minh' as Province,
        productType: 'SJC_BARS' as ProductType,
        buyPrice: Number(item.buy),
        sellPrice: Number(item.sell),
      })
    }

    return entries
  }

  /**
   * Fetch prices for a specific retailer (public method)
   */
  async getPricesByRetailer(retailer: string): Promise<PriceData[]> {
    const allPrices = await this.getCurrentPrices()
    return allPrices.filter(price => price.retailer === retailer)
  }

  /**
   * Fetch prices for a specific province (public method)
   */
  async getPricesByProvince(province: string): Promise<PriceData[]> {
    const allPrices = await this.getCurrentPrices()
    return allPrices.filter(price => price.province === province)
  }

  /**
   * Mock data for development/testing
   * Used when API key is not configured
   */
  private getMockData(): PriceData[] {
    const basePrice = 76500000 // Base price in VND
    const timestamp = new Date().toISOString()

    return [
      {
        id: '1',
        createdAt: timestamp,
        retailer: 'SJC',
        province: 'TP. Hồ Chí Minh',
        productType: 'SJC_BARS',
        buyPrice: basePrice,
        sellPrice: basePrice + 300000,
        unit: 'VND/chi',
      },
      {
        id: '2',
        createdAt: timestamp,
        retailer: 'SJC',
        province: 'Hà Nội',
        productType: 'SJC_BARS',
        buyPrice: basePrice + 50000,
        sellPrice: basePrice + 350000,
        unit: 'VND/chi',
      },
      {
        id: '3',
        createdAt: timestamp,
        retailer: 'DOJI',
        province: 'TP. Hồ Chí Minh',
        productType: 'SJC_BARS',
        buyPrice: basePrice - 100000,
        sellPrice: basePrice + 200000,
        unit: 'VND/chi',
      },
      {
        id: '4',
        createdAt: timestamp,
        retailer: 'PNJ',
        province: 'TP. Hồ Chí Minh',
        productType: 'SJC_RINGS',
        buyPrice: basePrice - 200000,
        sellPrice: basePrice + 100000,
        unit: 'VND/chi',
      },
      {
        id: '5',
        createdAt: timestamp,
        retailer: 'SJC',
        province: 'Đà Nẵng',
        productType: 'SJC_BARS',
        buyPrice: basePrice + 100000,
        sellPrice: basePrice + 400000,
        unit: 'VND/chi',
      },
      {
        id: '6',
        createdAt: timestamp,
        retailer: 'DOJI',
        province: 'Hà Nội',
        productType: 'SJC_BARS',
        buyPrice: basePrice - 50000,
        sellPrice: basePrice + 250000,
        unit: 'VND/chi',
      },
    ]
  }
}

/**
 * Singleton instance
 */
export const goldPriceAPI = new GoldPriceAPI()
