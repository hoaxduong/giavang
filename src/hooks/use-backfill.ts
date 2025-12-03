import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BackfillJob,
  BackfillJobLog,
  FullHistoricalConfig,
  DateRangeConfig,
  JobFilters,
} from '@/lib/api/backfill/types'

// API client functions
async function fetchJobs(filters?: JobFilters): Promise<BackfillJob[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status as string)
  if (filters?.sourceId) params.set('sourceId', filters.sourceId)
  if (filters?.jobType) params.set('jobType', filters.jobType)
  if (filters?.limit) params.set('limit', filters.limit.toString())
  if (filters?.offset) params.set('offset', filters.offset.toString())

  const response = await fetch(`/api/admin/crawler/backfill?${params}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch jobs')
  }
  const data = await response.json()
  return data.jobs
}

async function fetchJob(jobId: string): Promise<BackfillJob> {
  const response = await fetch(`/api/admin/crawler/backfill/${jobId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch job')
  }
  const data = await response.json()
  return data.job
}

async function fetchJobLogs(
  jobId: string,
  options?: { logLevel?: string; limit?: number; offset?: number }
): Promise<BackfillJobLog[]> {
  const params = new URLSearchParams()
  if (options?.logLevel) params.set('logLevel', options.logLevel)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())

  const response = await fetch(`/api/admin/crawler/backfill/${jobId}/logs?${params}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch logs')
  }
  const data = await response.json()
  return data.logs
}

async function createJob(payload: {
  jobType: 'full_historical' | 'date_range'
  sourceId: string
  config: FullHistoricalConfig | DateRangeConfig
  executeImmediately?: boolean
}): Promise<BackfillJob> {
  const response = await fetch('/api/admin/crawler/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create job')
  }

  const data = await response.json()
  return data.job
}

async function pauseJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/admin/crawler/backfill/${jobId}/pause`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to pause job')
  }
}

async function resumeJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/admin/crawler/backfill/${jobId}/resume`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to resume job')
  }
}

async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/admin/crawler/backfill/${jobId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel job')
  }
}

async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/admin/crawler/backfill/${jobId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete job')
  }
}

// React Query hooks
export function useBackfillJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['backfill-jobs', filters],
    queryFn: () => fetchJobs(filters),
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are running jobs
      const data = query.state.data
      const hasRunning = Array.isArray(data) && data.some((j) => j.status === 'running')
      return hasRunning ? 3000 : false
    },
  })
}

export function useBackfillJob(jobId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['backfill-job', jobId],
    queryFn: () => fetchJob(jobId),
    enabled,
    refetchInterval: (query) => {
      // Poll every 2 seconds if job is running
      const data = query.state.data
      return data?.status === 'running' ? 2000 : false
    },
  })
}

export function useJobLogs(
  jobId: string,
  options?: { logLevel?: string; limit?: number; offset?: number },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['backfill-job-logs', jobId, options],
    queryFn: () => fetchJobLogs(jobId, options),
    enabled,
  })
}

export function useCreateBackfillJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs'] })
    },
  })
}

export function usePauseJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: pauseJob,
    onSuccess: (_, jobId) => {
      // Invalidate specific job and jobs list
      queryClient.invalidateQueries({ queryKey: ['backfill-job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs'] })
    },
  })
}

export function useResumeJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resumeJob,
    onSuccess: (_, jobId) => {
      // Invalidate specific job and jobs list
      queryClient.invalidateQueries({ queryKey: ['backfill-job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs'] })
    },
  })
}

export function useCancelJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelJob,
    onSuccess: (_, jobId) => {
      // Invalidate specific job and jobs list
      queryClient.invalidateQueries({ queryKey: ['backfill-job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs'] })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs'] })
    },
  })
}
