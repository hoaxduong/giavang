import type { CrawlerConfig, CrawlerResult } from './types'

/**
 * Abstract base class for all price crawlers
 *
 * Provides common functionality for fetching prices from external APIs:
 * - Configuration management
 * - Abstract fetch method that must be implemented by subclasses
 * - Common error handling patterns
 *
 * @example
 * ```typescript
 * class MyCrawler extends BaseCrawler {
 *   async fetchPrices(): Promise<CrawlerResult> {
 *     const response = await fetch(this.config.apiUrl)
 *     const data = await response.json()
 *     return {
 *       success: true,
 *       data: this.parsePrices(data),
 *       metadata: { ... }
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseCrawler {
  protected config: CrawlerConfig

  constructor(config: CrawlerConfig) {
    this.config = config
  }

  /**
   * Fetch prices from the external API
   * Must be implemented by subclasses
   */
  abstract fetchPrices(): Promise<CrawlerResult>

  /**
   * Get crawler configuration
   */
  getConfig(): CrawlerConfig {
    return { ...this.config }
  }

  /**
   * Check if crawler is enabled
   */
  isEnabled(): boolean {
    return this.config.isEnabled
  }

  /**
   * Get crawler name
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get crawler API URL
   */
  getApiUrl(): string {
    return this.config.apiUrl
  }

  /**
   * Helper method to create fetch options with timeout
   */
  protected createFetchOptions(options: RequestInit = {}): RequestInit {
    const timeout = this.config.timeout || 30000
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceApp/1.0)',
      ...this.config.headers,
      ...options.headers,
    }

    return {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeout),
    }
  }

  /**
   * Helper method to handle common fetch errors
   */
  protected handleFetchError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error(`Request timeout after ${this.config.timeout}ms`)
      }
      return error
    }
    return new Error('Unknown fetch error')
  }
}
