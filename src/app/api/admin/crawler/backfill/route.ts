import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { z } from 'zod'
import { BackfillManager } from '@/lib/api/backfill/backfill-manager'
import { BackfillExecutor } from '@/lib/api/backfill/backfill-executor'
import type { FullHistoricalConfig, DateRangeConfig } from '@/lib/api/backfill/types'

// Validation schemas
const fullHistoricalConfigSchema = z.object({
  days: z.number().int().min(1).max(30),
  types: z.union([z.literal('all'), z.array(z.string())]),
})

const dateRangeConfigSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  types: z.union([z.literal('all'), z.array(z.string())]),
})

const createJobSchema = z.object({
  jobType: z.enum(['full_historical', 'date_range']),
  sourceId: z.string().uuid(),
  config: z.union([fullHistoricalConfigSchema, dateRangeConfigSchema]),
  executeImmediately: z.boolean().optional().default(false),
})

const listJobsSchema = z.object({
  status: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  jobType: z.enum(['full_historical', 'date_range']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

/**
 * GET /api/admin/crawler/backfill
 * List backfill jobs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('admin')
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const rawParams = {
      status: searchParams.get('status') || undefined,
      sourceId: searchParams.get('sourceId') || undefined,
      jobType: searchParams.get('jobType') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    }

    const params = listJobsSchema.parse(rawParams)

    // Build filters
    const filters: any = {}
    if (params.status) filters.status = params.status
    if (params.sourceId) filters.sourceId = params.sourceId
    if (params.jobType) filters.jobType = params.jobType
    if (params.limit) filters.limit = parseInt(params.limit)
    if (params.offset) filters.offset = parseInt(params.offset)

    const manager = new BackfillManager()
    const jobs = await manager.listJobs(filters)

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('GET /api/admin/crawler/backfill error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list jobs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/crawler/backfill
 * Create a new backfill job
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('admin')
    const body = await request.json()

    // Validate request body
    const validated = createJobSchema.parse(body)

    const manager = new BackfillManager()
    let jobId: string

    // Create job based on type
    if (validated.jobType === 'full_historical') {
      jobId = await manager.createFullHistoricalJob(
        validated.sourceId,
        validated.config as FullHistoricalConfig,
        user.id
      )
    } else {
      jobId = await manager.createDateRangeJob(
        validated.sourceId,
        validated.config as DateRangeConfig,
        user.id
      )
    }

    // Execute immediately if requested
    if (validated.executeImmediately) {
      // Execute in background (don't await)
      const executor = new BackfillExecutor(jobId)
      executor.execute().catch((error) => {
        console.error(`Background execution error for job ${jobId}:`, error)
      })
    }

    // Fetch the created job
    const job = await manager.getJob(jobId)

    return NextResponse.json(
      { job, message: 'Backfill job created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/admin/crawler/backfill error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
