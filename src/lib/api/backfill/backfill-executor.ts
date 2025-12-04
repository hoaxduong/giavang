import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { priceDataToSnapshot } from '../price-normalizer'
import { VangTodayHistoricalCrawler } from '../crawler/vang-today-historical-crawler'
import { SjcHistoricalCrawler } from '../crawler/sjc-historical-crawler'
import { RateLimiter } from './rate-limiter'
import type {
  BackfillJob,
  FullHistoricalConfig,
  DateRangeConfig,
  CheckpointData,
  FailedItem,
  DbBackfillJob,
} from './types'
import type { CrawlerConfig, TypeMapping, Retailer, Province, ProductType } from '../crawler/types'
import type { PriceData } from '@/lib/types'

/**
 * BackfillExecutor
 *
 * Executes backfill jobs with checkpoint/resume capability.
 * Fetches historical data and inserts into database.
 * Database handles duplicate detection via unique constraint.
 */
export class BackfillExecutor {
  private jobId: string
  private job: BackfillJob | null = null
  private isPaused: boolean = false
  private isCancelled: boolean = false
  private rateLimiter: RateLimiter | null = null
  private crawler: VangTodayHistoricalCrawler | SjcHistoricalCrawler | null = null

  // Progress tracking
  private itemsProcessed: number = 0
  private itemsSucceeded: number = 0
  private itemsFailed: number = 0
  private itemsSkipped: number = 0
  private recordsInserted: number = 0
  private failedItems: FailedItem[] = []

  // Checkpoint frequency (save every N type iterations)
  private readonly CHECKPOINT_FREQUENCY = 10

  constructor(jobId: string) {
    this.jobId = jobId
  }

  /**
   * Main execution entry point
   */
  async execute(): Promise<void> {
    const supabase = createServiceRoleClient()

    try {
      // Load job from database
      await this.loadJob()
      if (!this.job) {
        throw new Error('Job not found')
      }

      // Update status to running
      await this.updateJobStatus('running', { started_at: new Date().toISOString() })

      // Load checkpoint if resuming
      const checkpoint = this.job.checkpointData

      // Execute based on job type
      if (this.job.jobType === 'full_historical') {
        await this.executeFullHistorical(
          this.job.config as FullHistoricalConfig,
          checkpoint
        )
      } else if (this.job.jobType === 'date_range') {
        await this.executeDateRange(
          this.job.config as DateRangeConfig,
          checkpoint
        )
      }

      // Mark as completed
      const finalStatus = this.itemsFailed > 0 ? 'partial_success' : 'completed'
      await this.updateJobStatus(finalStatus, {
        completed_at: new Date().toISOString(),
        progress_percent: 100,
        items_processed: this.itemsProcessed,
        items_succeeded: this.itemsSucceeded,
        items_failed: this.itemsFailed,
        items_skipped: this.itemsSkipped,
        records_inserted: this.recordsInserted,
        failed_items: this.failedItems.length > 0 ? this.failedItems : null,
        checkpoint_data: null, // Clear checkpoint on completion
      })

      await this.log('info', 'Job completed successfully', {
        itemsProcessed: this.itemsProcessed,
        itemsSucceeded: this.itemsSucceeded,
        itemsFailed: this.itemsFailed,
        itemsSkipped: this.itemsSkipped,
        recordsInserted: this.recordsInserted,
      })
    } catch (error) {
      await this.handleExecutionError(error)
    }
  }

  /**
   * Execute full historical backfill
   */
  private async executeFullHistorical(
    config: FullHistoricalConfig,
    checkpoint: CheckpointData | null
  ): Promise<void> {
    await this.log('info', 'Starting full historical backfill', {
      days: config.days,
      types: config.types,
    })

    // Initialize crawler and rate limiter
    await this.initializeCrawler()

    // Get type mappings to process
    const typeMappings = await this.getTypeMappings(config.types)

    if (typeMappings.length === 0) {
      throw new Error('No enabled type mappings found')
    }

    await this.log('info', `Found ${typeMappings.length} types to process`)

    // Determine starting point from checkpoint
    const startTypeIndex = checkpoint?.currentTypeIndex || 0

    // Process each type
    for (let i = startTypeIndex; i < typeMappings.length; i++) {
      // Check for pause/cancel
      await this.checkPauseOrCancel()

      const mapping = typeMappings[i]

      await this.log('info', `Processing type ${i + 1}/${typeMappings.length}: ${mapping.externalCode}`)

      try {
        // Fetch historical data for this type
        const result = await this.crawler!.fetchHistoricalPrices(
          mapping.externalCode,
          config.days
        )

        // Wait for rate limit
        await this.rateLimiter!.waitForToken()

        if (!result.success || result.data.length === 0) {
          this.itemsFailed++
          this.failedItems.push({
            type: mapping.externalCode,
            date: '',
            error: result.errors[0]?.error || 'No data returned',
          })
          await this.log('warning', `Failed to fetch data for ${mapping.externalCode}`, result.errors)
          continue
        }

        // Convert daily prices to snapshots
        const snapshots = await this.convertToSnapshots(result.data, mapping)

        // Save to database (let DB handle duplicates with unique constraint)
        if (snapshots.length > 0) {
          const saved = await this.savePriceSnapshots(snapshots)
          this.recordsInserted += saved
          this.itemsSucceeded++
        } else {
          this.itemsSkipped++
        }

        this.itemsProcessed++

        // Update progress
        const progressPercent = Math.round(((i + 1) / typeMappings.length) * 100)
        await this.updateProgress(progressPercent)

        // Save checkpoint every N iterations
        if ((i + 1) % this.CHECKPOINT_FREQUENCY === 0) {
          await this.saveCheckpoint({
            currentTypeIndex: i + 1,
            currentDateIndex: 0,
            lastSuccessfulType: mapping.externalCode,
          })
        }
      } catch (error) {
        this.itemsFailed++
        this.failedItems.push({
          type: mapping.externalCode,
          date: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        await this.log('error', `Error processing ${mapping.externalCode}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  /**
   * Execute date range backfill
   */
  private async executeDateRange(
    config: DateRangeConfig,
    checkpoint: CheckpointData | null
  ): Promise<void> {
    await this.log('info', 'Starting date range backfill', {
      startDate: config.startDate,
      endDate: config.endDate,
      types: config.types,
    })

    // Initialize crawler and rate limiter
    await this.initializeCrawler()

    // Get type mappings to process
    const typeMappings = await this.getTypeMappings(config.types)

    if (typeMappings.length === 0) {
      throw new Error('No enabled type mappings found')
    }

    // Calculate days in range
    const startDate = new Date(config.startDate)
    const endDate = new Date(config.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    await this.log('info', `Found ${typeMappings.length} types to process over ${totalDays} days`)

    // Determine starting point from checkpoint
    const startTypeIndex = checkpoint?.currentTypeIndex || 0

    // Process each type
    for (let i = startTypeIndex; i < typeMappings.length; i++) {
      // Check for pause/cancel
      await this.checkPauseOrCancel()

      const mapping = typeMappings[i]

      await this.log('info', `Processing type ${i + 1}/${typeMappings.length}: ${mapping.externalCode}`)

      try {
        // For date range, we need to fetch in chunks (max 30 days at a time)
        const chunks = this.splitDateRangeIntoChunks(config.startDate, config.endDate, 30)

        for (const chunk of chunks) {
          // Fetch historical data for this type and chunk
          const result = await this.crawler!.fetchHistoricalPrices(
            mapping.externalCode,
            chunk.days
          )

          // Wait for rate limit
          await this.rateLimiter!.waitForToken()

          if (!result.success || result.data.length === 0) {
            this.itemsFailed++
            this.failedItems.push({
              type: mapping.externalCode,
              date: chunk.startDate,
              error: result.errors[0]?.error || 'No data returned',
            })
            await this.log('warning', `Failed to fetch data for ${mapping.externalCode}`, result.errors)
            continue
          }

          // Filter data to only include dates in our range
          const filteredData = result.data.filter((d) => {
            const date = new Date(d.date)
            return date >= startDate && date <= endDate
          })

          // Convert daily prices to snapshots
          const snapshots = await this.convertToSnapshots(filteredData, mapping)

          // Save to database (let DB handle duplicates with unique constraint)
          if (snapshots.length > 0) {
            const saved = await this.savePriceSnapshots(snapshots)
            this.recordsInserted += saved
          }
        }

        this.itemsSucceeded++
        this.itemsProcessed++

        // Update progress
        const progressPercent = Math.round(((i + 1) / typeMappings.length) * 100)
        await this.updateProgress(progressPercent)

        // Save checkpoint every N iterations
        if ((i + 1) % this.CHECKPOINT_FREQUENCY === 0) {
          await this.saveCheckpoint({
            currentTypeIndex: i + 1,
            currentDateIndex: 0,
            lastSuccessfulType: mapping.externalCode,
          })
        }
      } catch (error) {
        this.itemsFailed++
        this.failedItems.push({
          type: mapping.externalCode,
          date: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        await this.log('error', `Error processing ${mapping.externalCode}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  /**
   * Initialize crawler and rate limiter
   */
  private async initializeCrawler(): Promise<void> {
    const supabase = createServiceRoleClient()

    // Fetch source configuration
    const { data: source, error } = await supabase
      .from('crawler_sources')
      .select('*')
      .eq('id', this.job!.sourceId)
      .single()

    if (error || !source) {
      throw new Error('Failed to fetch crawler source configuration')
    }

    // Create crawler config
    const crawlerConfig: CrawlerConfig = {
      id: source.id,
      name: source.name,
      apiUrl: source.api_url,
      apiType: source.api_type,
      headers: source.headers,
      timeout: source.timeout_seconds ? source.timeout_seconds * 1000 : undefined,
      isEnabled: source.is_enabled,
      rateLimit: source.rate_limit_per_minute,
      priority: source.priority,
      fieldMappings: source.field_mappings,
    }

    // Create crawler instance based on source type
    switch (source.api_type) {
      case 'vang_today':
        this.crawler = new VangTodayHistoricalCrawler(crawlerConfig)
        break
      case 'sjc':
        this.crawler = new SjcHistoricalCrawler(crawlerConfig)
        break
      default:
        throw new Error(`Unsupported crawler type for backfill: ${source.api_type}`)
    }

    // Create rate limiter
    this.rateLimiter = new RateLimiter(
      source.id,
      source.rate_limit_per_minute || 60
    )
  }

  /**
   * Get type mappings to process
   */
  private async getTypeMappings(types: 'all' | string[]): Promise<TypeMapping[]> {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('crawler_type_mappings')
      .select('*')
      .eq('source_id', this.job!.sourceId)
      .eq('is_enabled', true)

    if (types !== 'all') {
      query = query.in('external_code', types)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch type mappings: ${error.message}`)
    }

    return (data || []).map((m) => ({
      id: m.id,
      sourceId: m.source_id,
      externalCode: m.external_code,
      retailerCode: m.retailer_code,
      productTypeCode: m.product_type_code,
      provinceCode: m.province_code,
      label: m.label,
      isEnabled: m.is_enabled,
    }))
  }

  /**
   * Convert daily price data to price snapshots
   */
  private async convertToSnapshots(
    dailyPrices: Array<{ date: string; type: string; buyPrice: number; sellPrice: number; currency?: string; change?: number }>,
    mapping: TypeMapping
  ): Promise<PriceData[]> {
    const supabase = createServiceRoleClient()

    // Fetch reference data
    const [retailerResult, provinceResult, productTypeResult] = await Promise.all([
      supabase.from('retailers').select('*').eq('code', mapping.retailerCode).eq('is_enabled', true).single(),
      supabase.from('provinces').select('*').eq('code', mapping.provinceCode || 'TP. Hồ Chí Minh').eq('is_enabled', true).single(),
      supabase.from('product_types').select('*').eq('code', mapping.productTypeCode).eq('is_enabled', true).single(),
    ])

    if (retailerResult.error || !retailerResult.data) {
      throw new Error(`Retailer ${mapping.retailerCode} not found or disabled`)
    }
    if (provinceResult.error || !provinceResult.data) {
      throw new Error(`Province ${mapping.provinceCode} not found or disabled`)
    }
    if (productTypeResult.error || !productTypeResult.data) {
      throw new Error(`Product type ${mapping.productTypeCode} not found or disabled`)
    }

    const retailer: Retailer = {
      id: retailerResult.data.id,
      code: retailerResult.data.code,
      name: retailerResult.data.name,
      isEnabled: retailerResult.data.is_enabled,
      sortOrder: retailerResult.data.sort_order,
    }

    const province: Province = {
      id: provinceResult.data.id,
      code: provinceResult.data.code,
      name: provinceResult.data.name,
      isEnabled: provinceResult.data.is_enabled,
      sortOrder: provinceResult.data.sort_order,
    }

    const productType: ProductType = {
      id: productTypeResult.data.id,
      code: productTypeResult.data.code,
      label: productTypeResult.data.label,
      shortLabel: productTypeResult.data.short_label,
      isEnabled: productTypeResult.data.is_enabled,
      sortOrder: productTypeResult.data.sort_order,
    }

    // Convert each daily price to snapshot
    // Use type assertion since we know the crawler type matches the daily price type
    return dailyPrices.map((daily) =>
      this.crawler!.convertDailyToSnapshot(daily as any, mapping, retailer, province, productType)
    )
  }

  /**
   * Save price snapshots to database
   */
  private async savePriceSnapshots(snapshots: PriceData[]): Promise<number> {
    const supabase = createServiceRoleClient()

    // Convert to database format
    const dbSnapshots = snapshots.map((snapshot) => {
      const dbSnapshot = priceDataToSnapshot(snapshot)
      return {
        ...dbSnapshot,
        source_job_id: this.jobId,
        is_backfilled: true,
      }
    })

    // Insert with ON CONFLICT DO NOTHING to skip duplicates
    // The unique constraint uses an expression, so we need raw SQL
    const insertPromises = snapshots.map(async (priceData, index) => {
      const dbSnapshot = dbSnapshots[index]
      const { error } = await supabase.rpc('insert_price_snapshot_ignore_duplicate', {
        p_retailer: dbSnapshot.retailer,
        p_province: dbSnapshot.province,
        p_product_type: dbSnapshot.product_type,
        p_buy_price: dbSnapshot.buy_price,
        p_sell_price: dbSnapshot.sell_price,
        p_unit: dbSnapshot.unit,
        p_created_at: priceData.createdAt,
        p_source_job_id: this.jobId,
        p_is_backfilled: true,
      })
      return error
    })

    const results = await Promise.all(insertPromises)
    const errors = results.filter(e => e !== null)

    if (errors.length > 0) {
      throw new Error(`Failed to save some price snapshots: ${errors[0]?.message}`)
    }

    return dbSnapshots.length
  }

  /**
   * Split date range into chunks (max chunk size)
   */
  private splitDateRangeIntoChunks(
    startDate: string,
    endDate: string,
    maxDays: number
  ): Array<{ startDate: string; days: number }> {
    const chunks: Array<{ startDate: string; days: number }> = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    let current = new Date(start)
    while (current <= end) {
      const remainingDays = Math.ceil((end.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const chunkDays = Math.min(remainingDays, maxDays)

      chunks.push({
        startDate: current.toISOString().split('T')[0],
        days: chunkDays,
      })

      current = new Date(current.getTime() + chunkDays * 24 * 60 * 60 * 1000)
    }

    return chunks
  }

  /**
   * Load job from database
   */
  private async loadJob(): Promise<void> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('backfill_jobs')
      .select('*')
      .eq('id', this.jobId)
      .single()

    if (error || !data) {
      throw new Error('Job not found')
    }

    const dbJob = data as DbBackfillJob
    this.job = {
      id: dbJob.id,
      jobType: dbJob.job_type as 'full_historical' | 'date_range',
      sourceId: dbJob.source_id,
      config: dbJob.config,
      status: dbJob.status as any,
      progressPercent: dbJob.progress_percent,
      startedAt: dbJob.started_at ? new Date(dbJob.started_at) : null,
      completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : null,
      totalItems: dbJob.total_items,
      itemsProcessed: dbJob.items_processed,
      itemsSucceeded: dbJob.items_succeeded,
      itemsFailed: dbJob.items_failed,
      itemsSkipped: dbJob.items_skipped,
      recordsInserted: dbJob.records_inserted,
      errorMessage: dbJob.error_message,
      failedItems: dbJob.failed_items || [],
      createdBy: dbJob.created_by,
      createdAt: new Date(dbJob.created_at),
      updatedAt: new Date(dbJob.updated_at),
      checkpointData: dbJob.checkpoint_data,
    }

    // Initialize counters from job state
    this.itemsProcessed = this.job.itemsProcessed
    this.itemsSucceeded = this.job.itemsSucceeded
    this.itemsFailed = this.job.itemsFailed
    this.itemsSkipped = this.job.itemsSkipped
    this.recordsInserted = this.job.recordsInserted
    this.failedItems = this.job.failedItems
  }

  /**
   * Update job status
   */
  private async updateJobStatus(status: string, updates: Partial<DbBackfillJob> = {}): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
      .from('backfill_jobs')
      .update({
        status,
        ...updates,
      })
      .eq('id', this.jobId)
  }

  /**
   * Update job progress
   */
  private async updateProgress(progressPercent: number): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
      .from('backfill_jobs')
      .update({
        progress_percent: progressPercent,
        items_processed: this.itemsProcessed,
        items_succeeded: this.itemsSucceeded,
        items_failed: this.itemsFailed,
        items_skipped: this.itemsSkipped,
        records_inserted: this.recordsInserted,
      })
      .eq('id', this.jobId)
  }

  /**
   * Save checkpoint
   */
  private async saveCheckpoint(checkpoint: CheckpointData): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
      .from('backfill_jobs')
      .update({
        checkpoint_data: checkpoint,
        items_processed: this.itemsProcessed,
        items_succeeded: this.itemsSucceeded,
        items_failed: this.itemsFailed,
        items_skipped: this.itemsSkipped,
        records_inserted: this.recordsInserted,
        failed_items: this.failedItems,
      })
      .eq('id', this.jobId)

    await this.log('info', 'Checkpoint saved', checkpoint)
  }

  /**
   * Check if job is paused or cancelled
   */
  private async checkPauseOrCancel(): Promise<void> {
    const supabase = createServiceRoleClient()

    // Re-fetch job status
    const { data } = await supabase
      .from('backfill_jobs')
      .select('status')
      .eq('id', this.jobId)
      .single()

    if (data?.status === 'paused') {
      this.isPaused = true
      throw new Error('Job paused')
    }

    if (data?.status === 'cancelled') {
      this.isCancelled = true
      throw new Error('Job cancelled')
    }
  }

  /**
   * Handle execution error
   */
  private async handleExecutionError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if paused or cancelled
    if (errorMessage === 'Job paused') {
      await this.log('info', 'Job paused by user')
      return
    }

    if (errorMessage === 'Job cancelled') {
      await this.log('info', 'Job cancelled by user')
      await this.updateJobStatus('cancelled', {
        completed_at: new Date().toISOString(),
      })
      return
    }

    // Log error
    await this.log('error', 'Job execution failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Update job status
    await this.updateJobStatus('failed', {
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
      items_processed: this.itemsProcessed,
      items_succeeded: this.itemsSucceeded,
      items_failed: this.itemsFailed,
      items_skipped: this.itemsSkipped,
      records_inserted: this.recordsInserted,
      failed_items: this.failedItems.length > 0 ? this.failedItems : null,
    })
  }

  /**
   * Log message to backfill_job_logs
   */
  private async log(
    level: 'info' | 'warning' | 'error',
    message: string,
    details?: unknown
  ): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase.from('backfill_job_logs').insert({
      job_id: this.jobId,
      log_level: level,
      message,
      details: details || null,
    })
  }
}
