import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { priceDataToSnapshot } from "../price-normalizer";
import { SjcCrawler } from "./sjc-crawler";
import type { BaseCrawler } from "./base-crawler";
import type { CrawlerConfig, SyncResult, DbCrawlerSource } from "./types";

/**
 * Crawler Manager
 *
 * Orchestrates multiple crawler sources:
 * - Manages lifecycle of multiple crawlers
 * - Triggers syncs for all sources or specific source
 * - Saves fetched prices to database
 * - Provides unified interface for sync operations
 */
export class CrawlerManager {
  /**
   * Sync all enabled crawler sources
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    const supabase = createServiceRoleClient();

    // Fetch all enabled sources ordered by priority
    const { data: sources, error } = await supabase
      .from("crawler_sources")
      .select("*")
      .eq("is_enabled", true)
      .order("priority", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch crawler sources: ${error.message}`);
    }

    if (!sources || sources.length === 0) {
      return {
        results: [],
        totalRecords: 0,
        totalErrors: 0,
        duration: Date.now() - startTime,
      };
    }

    // Sync each source
    const results: SyncResult["results"] = [];
    let totalRecords = 0;
    let totalErrors = 0;

    for (const source of sources) {
      try {
        const result = await this.syncSource(source.id);
        results.push({
          source: source.name,
          success: result.success,
          recordsSaved: result.recordsSaved,
        });
        totalRecords += result.recordsSaved;
        if (!result.success) {
          totalErrors++;
        }
      } catch (error) {
        results.push({
          source: source.name,
          success: false,
          recordsSaved: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        totalErrors++;
      }
    }

    return {
      results,
      totalRecords,
      totalErrors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Sync a specific crawler source by ID
   */
  async syncSource(
    sourceId: string,
    triggerType: "manual" | "cron" | "api" = "manual",
    triggerUserId?: string,
  ): Promise<{
    success: boolean;
    recordsSaved: number;
    error?: string;
  }> {
    const supabase = createServiceRoleClient();

    // Fetch source configuration
    const { data: source, error: sourceError } = await supabase
      .from("crawler_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(
        `Failed to fetch crawler source: ${sourceError?.message || "Not found"}`,
      );
    }

    // Check if source is enabled
    if (!source.is_enabled) {
      throw new Error(`Crawler source ${source.name} is disabled`);
    }

    // Create crawler instance
    const crawler = this.createCrawler(source, triggerType, triggerUserId);

    // Fetch prices
    const result = await crawler.fetchPrices();

    if (!result.success) {
      return {
        success: false,
        recordsSaved: 0,
        error: "Failed to fetch prices from source",
      };
    }

    // Save prices to database
    const recordsSaved = await this.savePrices(result.data, sourceId);

    return {
      success: true,
      recordsSaved,
    };
  }

  /**
   * Create crawler instance based on source type
   */
  private createCrawler(
    source: DbCrawlerSource,
    triggerType: "manual" | "cron" | "api" = "cron",
    triggerUserId?: string,
  ): BaseCrawler {
    const config: CrawlerConfig = {
      id: source.id,
      name: source.name,
      apiUrl: source.api_url,
      apiType: source.api_type,
      headers: source.headers || {},
      timeout: source.timeout_seconds ? source.timeout_seconds * 1000 : 30000,
      isEnabled: source.is_enabled,
      rateLimit: source.rate_limit_per_minute,
      priority: source.priority,
    };

    switch (source.api_type) {
      case "sjc": {
        const crawler = new SjcCrawler(config);
        crawler.setTriggerInfo(triggerType, triggerUserId);
        return crawler;
      }
      // Future crawler types can be added here
      // case 'goldapi':
      //   return new GoldApiCrawler(config)
      default:
        throw new Error(`Unsupported crawler type: ${source.api_type}`);
    }
  }

  /**
   * Save prices to database
   * Converts PriceData to snapshots and inserts
   */
  private async savePrices(
    prices: import("@/lib/types").PriceData[],
    sourceId: string,
  ): Promise<number> {
    if (prices.length === 0) {
      return 0;
    }

    const supabase = createServiceRoleClient();

    // Convert to database snapshots
    const snapshots = prices.map((price) => priceDataToSnapshot(price));

    // Insert snapshots
    const { error, count } = await supabase
      .from("price_snapshots")
      .insert(snapshots);

    if (error) {
      console.error("Failed to save price snapshots:", error);
      throw new Error(`Failed to save prices: ${error.message}`);
    }

    return count || snapshots.length;
  }

  /**
   * Get status of all sources
   * Including last sync time and success rate
   */
  async getSourcesStatus(): Promise<
    Array<{
      id: string;
      name: string;
      isEnabled: boolean;
      lastSync: Date | null;
      successRate: number;
    }>
  > {
    const supabase = createServiceRoleClient();

    const { data: sources } = await supabase
      .from("crawler_sources")
      .select("*")
      .order("priority");

    if (!sources) {
      return [];
    }

    const statuses = await Promise.all(
      sources.map(async (source) => {
        // Get last sync time
        const { data: lastLog } = await supabase
          .from("crawler_logs")
          .select("completed_at")
          .eq("source_id", source.id)
          .eq("status", "success")
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        // Calculate success rate (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentLogs } = await supabase
          .from("crawler_logs")
          .select("status")
          .eq("source_id", source.id)
          .gte("started_at", sevenDaysAgo.toISOString());

        let successRate = 100;
        if (recentLogs && recentLogs.length > 0) {
          const successCount = recentLogs.filter(
            (log) => log.status === "success",
          ).length;
          successRate = Math.round((successCount / recentLogs.length) * 100);
        }

        return {
          id: source.id,
          name: source.name,
          isEnabled: source.is_enabled,
          lastSync: lastLog?.completed_at
            ? new Date(lastLog.completed_at)
            : null,
          successRate,
        };
      }),
    );

    return statuses;
  }
}

/**
 * Singleton instance
 */
export const crawlerManager = new CrawlerManager();
