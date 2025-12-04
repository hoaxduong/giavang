import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CrawlerLogEntry } from "./types";

/**
 * Crawler Logger
 *
 * Manages logging of crawler sync operations to the database.
 * Uses service role client to bypass RLS policies.
 */
export class CrawlerLogger {
  /**
   * Create a new log entry in running status
   * Returns the log ID for later updates
   */
  async createLog(
    sourceId: string,
    triggerType: "manual" | "cron" | "api",
    triggerUserId?: string,
  ): Promise<string> {
    const supabase = createServiceRoleClient();

    const logEntry: Partial<CrawlerLogEntry> = {
      sourceId,
      startedAt: new Date().toISOString(),
      status: "running",
      recordsFetched: 0,
      recordsSaved: 0,
      recordsFailed: 0,
      triggerType,
      triggerUserId,
    };

    const { data, error } = await supabase
      .from("crawler_logs")
      .insert({
        source_id: logEntry.sourceId,
        started_at: logEntry.startedAt,
        status: logEntry.status,
        records_fetched: logEntry.recordsFetched,
        records_saved: logEntry.recordsSaved,
        records_failed: logEntry.recordsFailed,
        trigger_type: logEntry.triggerType,
        trigger_user_id: logEntry.triggerUserId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create crawler log:", error);
      throw new Error(`Failed to create crawler log: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update log with completion details
   */
  async updateLog(
    logId: string,
    updates: {
      status: "success" | "partial_success" | "failed";
      recordsFetched?: number;
      recordsSaved?: number;
      recordsFailed?: number;
      requestUrl?: string;
      requestMethod?: string;
      responseStatus?: number;
      responseTimeMs?: number;
      errorMessage?: string;
      errorStack?: string;
      failedItems?: Array<{ item: string; error: string }>;
    },
  ): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("crawler_logs")
      .update({
        completed_at: new Date().toISOString(),
        status: updates.status,
        records_fetched: updates.recordsFetched,
        records_saved: updates.recordsSaved,
        records_failed: updates.recordsFailed,
        request_url: updates.requestUrl,
        request_method: updates.requestMethod,
        response_status: updates.responseStatus,
        response_time_ms: updates.responseTimeMs,
        error_message: updates.errorMessage,
        error_stack: updates.errorStack,
        failed_items: updates.failedItems,
      })
      .eq("id", logId);

    if (error) {
      console.error("Failed to update crawler log:", error);
      // Don't throw here - log update failure shouldn't break the sync
    }
  }

  /**
   * Quick success log
   */
  async logSuccess(
    sourceId: string,
    recordsFetched: number,
    recordsSaved: number,
    responseTimeMs: number,
    responseStatus: number,
    triggerType: "manual" | "cron" | "api",
    triggerUserId?: string,
  ): Promise<void> {
    const logId = await this.createLog(sourceId, triggerType, triggerUserId);
    await this.updateLog(logId, {
      status: "success",
      recordsFetched,
      recordsSaved,
      recordsFailed: 0,
      responseStatus,
      responseTimeMs,
    });
  }

  /**
   * Quick failure log
   */
  async logFailure(
    sourceId: string,
    errorMessage: string,
    errorStack: string,
    responseTimeMs: number,
    responseStatus?: number,
    triggerType: "manual" | "cron" | "api" = "cron",
    triggerUserId?: string,
  ): Promise<void> {
    const logId = await this.createLog(sourceId, triggerType, triggerUserId);
    await this.updateLog(logId, {
      status: "failed",
      recordsFetched: 0,
      recordsSaved: 0,
      recordsFailed: 0,
      responseStatus,
      responseTimeMs,
      errorMessage,
      errorStack,
    });
  }

  /**
   * Get recent logs for a source
   */
  async getRecentLogs(
    sourceId: string,
    limit: number = 10,
  ): Promise<CrawlerLogEntry[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("crawler_logs")
      .select("*")
      .eq("source_id", sourceId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch crawler logs:", error);
      return [];
    }

    return data.map((log) => ({
      sourceId: log.source_id,
      startedAt: log.started_at,
      completedAt: log.completed_at,
      status: log.status,
      recordsFetched: log.records_fetched,
      recordsSaved: log.records_saved,
      recordsFailed: log.records_failed,
      requestUrl: log.request_url,
      requestMethod: log.request_method,
      responseStatus: log.response_status,
      responseTimeMs: log.response_time_ms,
      errorMessage: log.error_message,
      errorStack: log.error_stack,
      failedItems: log.failed_items,
      triggerType: log.trigger_type,
      triggerUserId: log.trigger_user_id,
    }));
  }

  /**
   * Get last successful sync time for a source
   */
  async getLastSuccessTime(sourceId: string): Promise<Date | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("crawler_logs")
      .select("completed_at")
      .eq("source_id", sourceId)
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.completed_at);
  }
}

/**
 * Singleton instance
 */
export const crawlerLogger = new CrawlerLogger();
