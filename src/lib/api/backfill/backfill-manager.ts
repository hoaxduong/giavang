import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { dbJobToJob } from "./types";
import type {
  BackfillJob,
  BackfillJobStatus,
  FullHistoricalConfig,
  DateRangeConfig,
  JobFilters,
  JobStats,
  DbBackfillJob,
} from "./types";

/**
 * BackfillManager
 *
 * Orchestrates backfill job creation and management.
 * Handles job lifecycle, validation, and monitoring.
 */
export class BackfillManager {
  /**
   * Create a full historical backfill job
   *
   * @param sourceId - Crawler source ID
   * @param config - Full historical configuration
   * @param userId - User creating the job
   * @returns Job ID
   */
  async createFullHistoricalJob(
    sourceId: string,
    config: FullHistoricalConfig,
    userId: string,
  ): Promise<string> {
    // Validate config
    await this.validateFullHistoricalConfig(config);

    // Check for concurrent jobs
    await this.checkConcurrentJobs(sourceId);

    // Calculate estimated job size
    const totalItems = await this.estimateFullHistoricalSize(sourceId, config);

    // Create job
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("backfill_jobs")
      .insert({
        job_type: "full_historical",
        source_id: sourceId,
        config,
        status: "pending",
        total_items: totalItems,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create backfill job: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Create a date range backfill job
   *
   * @param sourceId - Crawler source ID
   * @param config - Date range configuration
   * @param userId - User creating the job
   * @returns Job ID
   */
  async createDateRangeJob(
    sourceId: string,
    config: DateRangeConfig,
    userId: string,
  ): Promise<string> {
    // Validate config
    await this.validateDateRangeConfig(config);

    // Check for concurrent jobs
    await this.checkConcurrentJobs(sourceId);

    // Calculate estimated job size
    const totalItems = await this.estimateDateRangeSize(sourceId, config);

    // Create job
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("backfill_jobs")
      .insert({
        job_type: "date_range",
        source_id: sourceId,
        config,
        status: "pending",
        total_items: totalItems,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create backfill job: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("backfill_jobs")
      .update({ status: "paused" })
      .eq("id", jobId)
      .eq("status", "running");

    if (error) {
      throw new Error(`Failed to pause job: ${error.message}`);
    }
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("backfill_jobs")
      .update({ status: "pending" })
      .eq("id", jobId)
      .eq("status", "paused");

    if (error) {
      throw new Error(`Failed to resume job: ${error.message}`);
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("backfill_jobs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .in("status", ["pending", "running", "paused"]);

    if (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  }

  /**
   * Delete a job (only if completed/failed/cancelled)
   */
  async deleteJob(jobId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("backfill_jobs")
      .delete()
      .eq("id", jobId)
      .in("status", ["completed", "partial_success", "failed", "cancelled"]);

    if (error) {
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }

  /**
   * Get job details
   */
  async getJob(jobId: string): Promise<BackfillJob | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("backfill_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    return dbJobToJob(data as DbBackfillJob);
  }

  /**
   * List jobs with filters
   */
  async listJobs(filters?: JobFilters): Promise<BackfillJob[]> {
    const supabase = createServiceRoleClient();

    let query = supabase.from("backfill_jobs").select("*");

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in("status", filters.status);
      } else {
        query = query.eq("status", filters.status);
      }
    }

    if (filters?.sourceId) {
      query = query.eq("source_id", filters.sourceId);
    }

    if (filters?.jobType) {
      query = query.eq("job_type", filters.jobType);
    }

    // Order by created date descending
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list jobs: ${error.message}`);
    }

    return (data as DbBackfillJob[]).map(dbJobToJob);
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<JobStats> {
    const supabase = createServiceRoleClient();

    // Get counts by status
    const { data, error } = await supabase
      .from("backfill_jobs")
      .select("status, records_inserted");

    if (error) {
      throw new Error(`Failed to get job stats: ${error.message}`);
    }

    const stats: JobStats = {
      totalJobs: data.length,
      runningJobs: data.filter((j) => j.status === "running").length,
      completedJobs: data.filter(
        (j) => j.status === "completed" || j.status === "partial_success",
      ).length,
      failedJobs: data.filter((j) => j.status === "failed").length,
      totalRecordsInserted: data.reduce(
        (sum, j) => sum + (j.records_inserted || 0),
        0,
      ),
    };

    return stats;
  }

  /**
   * Validate full historical config
   */
  private async validateFullHistoricalConfig(
    config: FullHistoricalConfig,
  ): Promise<void> {
    if (config.days < 1 || config.days > 30) {
      throw new Error("Days must be between 1 and 30");
    }

    // Validate types if not 'all'
    if (config.types !== "all" && config.types.length === 0) {
      throw new Error("At least one type must be specified");
    }
  }

  /**
   * Validate date range config
   */
  private async validateDateRangeConfig(
    config: DateRangeConfig,
  ): Promise<void> {
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }

    if (startDate >= endDate) {
      throw new Error("Start date must be before end date");
    }

    // Check if date range is not too large (max 30 days)
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 30) {
      throw new Error("Date range must not exceed 30 days");
    }

    // Check dates are in the past
    const now = new Date();
    if (endDate > now) {
      throw new Error("End date cannot be in the future");
    }

    // Validate types if not 'all'
    if (config.types !== "all" && config.types.length === 0) {
      throw new Error("At least one type must be specified");
    }
  }

  /**
   * Check for concurrent jobs on same source
   */
  private async checkConcurrentJobs(sourceId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("backfill_jobs")
      .select("id")
      .eq("source_id", sourceId)
      .in("status", ["pending", "running", "paused"])
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check concurrent jobs: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `A backfill job is already running for this source (Job ID: ${data.id})`,
      );
    }
  }

  /**
   * Estimate job size for full historical backfill
   */
  private async estimateFullHistoricalSize(
    sourceId: string,
    config: FullHistoricalConfig,
  ): Promise<number> {
    const supabase = createServiceRoleClient();

    // Get count of enabled type mappings
    let query = supabase
      .from("crawler_type_mappings")
      .select("id", { count: "exact", head: true })
      .eq("source_id", sourceId)
      .eq("is_enabled", true);

    // If specific types, filter by them
    if (config.types !== "all") {
      query = query.in("external_code", config.types);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to estimate job size: ${error.message}`);
    }

    // Total items = number of types × number of days
    return (count || 0) * config.days;
  }

  /**
   * Estimate job size for date range backfill
   */
  private async estimateDateRangeSize(
    sourceId: string,
    config: DateRangeConfig,
  ): Promise<number> {
    const supabase = createServiceRoleClient();

    // Calculate number of days
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    const diffDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Get count of enabled type mappings
    let query = supabase
      .from("crawler_type_mappings")
      .select("id", { count: "exact", head: true })
      .eq("source_id", sourceId)
      .eq("is_enabled", true);

    // If specific types, filter by them
    if (config.types !== "all") {
      query = query.in("external_code", config.types);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to estimate job size: ${error.message}`);
    }

    // Total items = number of types × number of days
    return (count || 0) * diffDays;
  }
}
