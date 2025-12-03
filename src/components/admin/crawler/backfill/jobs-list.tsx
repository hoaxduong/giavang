'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useBackfillJobs, usePauseJob, useResumeJob, useCancelJob, useDeleteJob } from '@/hooks/use-backfill'
import { Loader2, Play, Pause, X, Trash2, Eye } from 'lucide-react'
import type { BackfillJobStatus } from '@/lib/api/backfill/types'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const statusColors: Record<BackfillJobStatus, string> = {
  pending: 'bg-gray-500',
  running: 'bg-blue-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  partial_success: 'bg-orange-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-400',
}

const statusLabels: Record<BackfillJobStatus, string> = {
  pending: 'Đang chờ',
  running: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  partial_success: 'Hoàn thành một phần',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
}

export function JobsList() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: jobs, isLoading } = useBackfillJobs(
    statusFilter !== 'all' ? { status: statusFilter as BackfillJobStatus } : undefined
  )

  const pauseJobMutation = usePauseJob()
  const resumeJobMutation = useResumeJob()
  const cancelJobMutation = useCancelJob()
  const deleteJobMutation = useDeleteJob()

  const handlePause = async (jobId: string) => {
    try {
      await pauseJobMutation.mutateAsync(jobId)
      toast({ title: 'Thành công', description: 'Đã tạm dừng công việc' })
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tạm dừng',
        variant: 'destructive',
      })
    }
  }

  const handleResume = async (jobId: string) => {
    try {
      await resumeJobMutation.mutateAsync(jobId)
      toast({ title: 'Thành công', description: 'Đã tiếp tục công việc' })
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tiếp tục',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (jobId: string) => {
    if (!confirm('Bạn có chắc muốn hủy công việc này?')) return

    try {
      await cancelJobMutation.mutateAsync(jobId)
      toast({ title: 'Thành công', description: 'Đã hủy công việc' })
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể hủy',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Bạn có chắc muốn xóa công việc này?')) return

    try {
      await deleteJobMutation.mutateAsync(jobId)
      toast({ title: 'Thành công', description: 'Đã xóa công việc' })
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể xóa',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Lọc theo trạng thái:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="running">Đang chạy</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
              <SelectItem value="paused">Tạm dừng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {jobs?.length || 0} công việc
        </div>
      </div>

      {jobs && jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Không có công việc nào
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs?.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {job.jobType === 'full_historical' ? 'Thu thập toàn bộ lịch sử' : 'Thu thập theo khoảng thời gian'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Tạo {formatDistanceToNow(job.createdAt, { addSuffix: true, locale: vi })}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[job.status]}>
                    {statusLabels[job.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                {job.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Tiến độ</span>
                      <span className="font-medium">{job.progressPercent}%</span>
                    </div>
                    <Progress value={job.progressPercent} />
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Đã xử lý</div>
                    <div className="font-medium">{job.itemsProcessed}/{job.totalItems}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Thành công</div>
                    <div className="font-medium text-green-600">{job.itemsSucceeded}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Thất bại</div>
                    <div className="font-medium text-red-600">{job.itemsFailed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bản ghi</div>
                    <div className="font-medium">{job.recordsInserted}</div>
                  </div>
                </div>

                {/* Error message */}
                {job.errorMessage && (
                  <div className="rounded bg-red-50 dark:bg-red-950 p-3 text-sm text-red-900 dark:text-red-100">
                    {job.errorMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {job.status === 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePause(job.id)}
                      disabled={pauseJobMutation.isPending}
                    >
                      <Pause className="mr-1 h-4 w-4" />
                      Tạm dừng
                    </Button>
                  )}

                  {job.status === 'paused' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResume(job.id)}
                      disabled={resumeJobMutation.isPending}
                    >
                      <Play className="mr-1 h-4 w-4" />
                      Tiếp tục
                    </Button>
                  )}

                  {(job.status === 'running' || job.status === 'paused' || job.status === 'pending') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(job.id)}
                      disabled={cancelJobMutation.isPending}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Hủy
                    </Button>
                  )}

                  {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'partial_success') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(job.id)}
                      disabled={deleteJobMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Xóa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
