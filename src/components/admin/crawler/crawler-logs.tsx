'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface CrawlerLog {
  id: string
  source_id: string | null
  started_at: string
  completed_at: string | null
  status: string
  records_fetched: number
  records_saved: number
  records_failed: number
  response_status: number | null
  response_time_ms: number | null
  error_message: string | null
  error_stack: string | null
  failed_items: any
  crawler_sources?: { name: string }
}

export function CrawlerLogs() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<CrawlerLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['crawler-logs', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })
      const res = await fetch(`/api/admin/crawler/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'partial_success':
        return 'secondary'
      case 'running':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Thành công'
      case 'failed':
        return 'Thất bại'
      case 'partial_success':
        return 'Một phần'
      case 'running':
        return 'Đang chạy'
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lịch sử đồng bộ</h3>
          <p className="text-sm text-muted-foreground">
            Lịch sử các lần đồng bộ dữ liệu từ crawler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="success">Thành công</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
              <SelectItem value="partial_success">Một phần</SelectItem>
              <SelectItem value="running">Đang chạy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nguồn</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Fetched</TableHead>
              <TableHead className="text-right">Saved</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Time (ms)</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !data?.logs || data.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Chưa có log
                </TableCell>
              </TableRow>
            ) : (
              data.logs.map((log: CrawlerLog) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.crawler_sources?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(log.started_at), 'dd/MM/yyyy', { locale: vi })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.started_at), 'HH:mm:ss', { locale: vi })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(log.status)}>
                      {getStatusLabel(log.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{log.records_fetched}</TableCell>
                  <TableCell className="text-right">{log.records_saved}</TableCell>
                  <TableCell className="text-right">
                    {log.records_failed > 0 ? (
                      <span className="text-red-600 font-medium">{log.records_failed}</span>
                    ) : (
                      log.records_failed
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.response_time_ms?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {data.pagination.page} / {data.pagination.pages} (Tổng: {data.pagination.total})
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage(p => p + 1)}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết Log</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nguồn</Label>
                  <p className="text-sm">{selectedLog.crawler_sources?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <Badge variant={getStatusColor(selectedLog.status)}>
                    {getStatusLabel(selectedLog.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bắt đầu</Label>
                  <p className="text-sm">
                    {format(new Date(selectedLog.started_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </p>
                </div>
                {selectedLog.completed_at && (
                  <div>
                    <Label>Kết thúc</Label>
                    <p className="text-sm">
                      {format(new Date(selectedLog.completed_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Fetched</Label>
                  <p className="text-sm font-medium">{selectedLog.records_fetched}</p>
                </div>
                <div>
                  <Label>Saved</Label>
                  <p className="text-sm font-medium text-green-600">{selectedLog.records_saved}</p>
                </div>
                <div>
                  <Label>Failed</Label>
                  <p className="text-sm font-medium text-red-600">{selectedLog.records_failed}</p>
                </div>
              </div>

              {selectedLog.response_status && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Response Status</Label>
                    <p className="text-sm">{selectedLog.response_status}</p>
                  </div>
                  <div>
                    <Label>Response Time</Label>
                    <p className="text-sm">{selectedLog.response_time_ms}ms</p>
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <Label>Lỗi</Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.error_stack && (
                <div>
                  <Label>Stack Trace</Label>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                    {selectedLog.error_stack}
                  </pre>
                </div>
              )}

              {selectedLog.failed_items && Array.isArray(selectedLog.failed_items) && selectedLog.failed_items.length > 0 && (
                <div>
                  <Label>Failed Items ({selectedLog.failed_items.length})</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {selectedLog.failed_items.map((item: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted rounded text-sm">
                        <span className="font-mono">{item.item}</span>:{' '}
                        <span className="text-red-600">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-muted-foreground mb-1">{children}</div>
}
