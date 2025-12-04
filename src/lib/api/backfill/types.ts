/**
 * Backfill System Type Definitions
 *
 * Type definitions for the historical data backfill feature.
 * Supports full historical and date range backfill jobs.
 */

/**
 * Backfill job types
 */
export type BackfillJobType = "full_historical" | "date_range";

/**
 * Backfill job status
 */
export type BackfillJobStatus =
  | "pending" // Job created, not yet started
  | "running" // Currently executing
  | "paused" // Paused (manually or due to timeout)
  | "completed" // Successfully completed
  | "partial_success" // Completed with some failures
  | "failed" // Failed to complete
  | "cancelled"; // Manually cancelled

/**
 * Configuration for full historical backfill
 */
export interface FullHistoricalConfig {
  days: number; // Number of days to backfill (default: 30)
  types: "all" | string[]; // 'all' or specific type codes
}

/**
 * Configuration for date range backfill
 */
export interface DateRangeConfig {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  types: "all" | string[]; // 'all' or specific type codes
}

/**
 * Union type for all job configurations
 */
export type BackfillJobConfig = FullHistoricalConfig | DateRangeConfig;

/**
 * Failed item details
 */
export interface FailedItem {
  type: string; // External type code
  date: string; // YYYY-MM-DD
  error: string; // Error message
}

/**
 * Checkpoint data for resume capability
 */
export interface CheckpointData {
  currentTypeIndex: number; // Index of current type being processed
  currentDateIndex: number; // Index of current date being processed
  lastSuccessfulType?: string; // Last successfully processed type
  lastSuccessfulDate?: string; // Last successfully processed date
}

/**
 * Backfill job (application format - camelCase)
 */
export interface BackfillJob {
  id: string;
  jobType: BackfillJobType;
  sourceId: string | null;
  config: BackfillJobConfig;
  status: BackfillJobStatus;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  totalItems: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  itemsSkipped: number;
  recordsInserted: number;
  errorMessage: string | null;
  failedItems: FailedItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  checkpointData: CheckpointData | null;
}

/**
 * Backfill job log entry (application format - camelCase)
 */
export interface BackfillJobLog {
  id: string;
  jobId: string;
  logLevel: "info" | "warning" | "error";
  message: string;
  details: unknown;
  createdAt: Date;
}

/**
 * Database entity for backfill_jobs table (snake_case from Supabase)
 */
export interface DbBackfillJob {
  id: string;
  job_type: string;
  source_id: string | null;
  config: BackfillJobConfig;
  status: string;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  total_items: number;
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  items_skipped: number;
  records_inserted: number;
  error_message: string | null;
  failed_items: FailedItem[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  checkpoint_data: CheckpointData | null;
}

/**
 * Database entity for backfill_job_logs table (snake_case from Supabase)
 */
export interface DbBackfillJobLog {
  id: string;
  job_id: string;
  log_level: string;
  message: string;
  details: unknown;
  created_at: string;
}

/**
 * Converter function from database to application format
 */
export function dbJobToJob(db: DbBackfillJob): BackfillJob {
  return {
    id: db.id,
    jobType: db.job_type as BackfillJobType,
    sourceId: db.source_id,
    config: db.config,
    status: db.status as BackfillJobStatus,
    progressPercent: db.progress_percent,
    startedAt: db.started_at ? new Date(db.started_at) : null,
    completedAt: db.completed_at ? new Date(db.completed_at) : null,
    totalItems: db.total_items,
    itemsProcessed: db.items_processed,
    itemsSucceeded: db.items_succeeded,
    itemsFailed: db.items_failed,
    itemsSkipped: db.items_skipped,
    recordsInserted: db.records_inserted,
    errorMessage: db.error_message,
    failedItems: db.failed_items || [],
    createdBy: db.created_by,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    checkpointData: db.checkpoint_data,
  };
}

/**
 * Converter function from database to application format for logs
 */
export function dbLogToLog(db: DbBackfillJobLog): BackfillJobLog {
  return {
    id: db.id,
    jobId: db.job_id,
    logLevel: db.log_level as "info" | "warning" | "error",
    message: db.message,
    details: db.details,
    createdAt: new Date(db.created_at),
  };
}

/**
 * Job filters for listing jobs
 */
export interface JobFilters {
  status?: BackfillJobStatus | BackfillJobStatus[];
  sourceId?: string;
  jobType?: BackfillJobType;
  limit?: number;
  offset?: number;
}

/**
 * Log options for fetching logs
 */
export interface LogOptions {
  logLevel?: "info" | "warning" | "error";
  limit?: number;
  offset?: number;
}

/**
 * Job statistics
 */
export interface JobStats {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRecordsInserted: number;
}
