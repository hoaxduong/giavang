/**
 * RateLimiter
 *
 * Implements token bucket algorithm for API rate limiting.
 * Ensures we respect the rate limit defined in crawler_sources table.
 */
export class RateLimiter {
  private sourceId: string
  private requestsPerMinute: number
  private tokens: number[] = [] // Timestamps of recent requests

  constructor(sourceId: string, requestsPerMinute: number) {
    this.sourceId = sourceId
    this.requestsPerMinute = requestsPerMinute
  }

  /**
   * Wait until a request token is available
   * Implements token bucket algorithm
   */
  async waitForToken(): Promise<void> {
    // Clean up old tokens (older than 1 minute)
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    this.tokens = this.tokens.filter((t) => t > oneMinuteAgo)

    // Check if we've hit the rate limit
    if (this.tokens.length >= this.requestsPerMinute) {
      // Calculate how long to wait
      const oldestToken = this.tokens[0]
      const waitTime = oldestToken + 60 * 1000 - now + 100 // Add 100ms buffer

      if (waitTime > 0) {
        // Wait until oldest token expires
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        // Recursively try again
        return this.waitForToken()
      }
    }

    // Add current request token
    this.tokens.push(now)
  }

  /**
   * Check if rate limit would be exceeded
   */
  wouldExceedLimit(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const recentTokens = this.tokens.filter((t) => t > oneMinuteAgo)
    return recentTokens.length >= this.requestsPerMinute
  }

  /**
   * Get time until next token available (in milliseconds)
   */
  getWaitTime(): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const recentTokens = this.tokens.filter((t) => t > oneMinuteAgo)

    if (recentTokens.length < this.requestsPerMinute) {
      return 0
    }

    const oldestToken = recentTokens[0]
    return Math.max(0, oldestToken + 60 * 1000 - now)
  }

  /**
   * Reset the rate limiter (clear all tokens)
   */
  reset(): void {
    this.tokens = []
  }
}
