'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Plus, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CrawlerSource {
  id: string
  name: string
  api_url: string
  api_type: string
  is_enabled: boolean
  priority: number
  rate_limit_per_minute?: number
  timeout_seconds?: number
}

export function CrawlerSources() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CrawlerSource | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    apiType: 'vang_today',
    priority: 1,
    rateLimitPerMinute: 60,
    timeoutSeconds: 30,
  })
  const [error, setError] = useState<string | null>(null)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['crawler-sources'],
    queryFn: async () => {
      const res = await fetch('/api/admin/crawler/sources')
      if (!res.ok) throw new Error('Failed to fetch sources')
      const json = await res.json()
      return json.sources as CrawlerSource[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/crawler/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create source')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-sources'] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update source')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-sources'] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete source')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-sources'] })
    },
  })

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-sources'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      apiUrl: '',
      apiType: 'vang_today',
      priority: 1,
      rateLimitPerMinute: 60,
      timeoutSeconds: 30,
    })
    setEditingItem(null)
    setError(null)
  }

  const handleOpenDialog = (item?: CrawlerSource) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        apiUrl: item.api_url,
        apiType: item.api_type,
        priority: item.priority,
        rateLimitPerMinute: item.rate_limit_per_minute || 60,
        timeoutSeconds: item.timeout_seconds || 30,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      apiUrl: formData.apiUrl,
      apiType: formData.apiType,
      priority: formData.priority,
      rateLimitPerMinute: formData.rateLimitPerMinute,
      timeoutSeconds: formData.timeoutSeconds,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Nguồn dữ liệu Crawler</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các API nguồn để thu thập giá vàng
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nguồn
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>API URL</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !sources || sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có nguồn dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <a
                      href={source.api_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      {source.api_url.substring(0, 40)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{source.api_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleEnabledMutation.mutate({
                            id: source.id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge variant={source.is_enabled ? 'default' : 'secondary'}>
                        {source.is_enabled ? 'Kích hoạt' : 'Tắt'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{source.priority}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(source)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa nguồn này?')) {
                            deleteMutation.mutate(source.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Chỉnh sửa' : 'Thêm'} nguồn dữ liệu
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Tên nguồn *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: vang.today"
                />
              </div>
              <div>
                <Label htmlFor="apiType">Loại API *</Label>
                <Input
                  id="apiType"
                  value={formData.apiType}
                  onChange={(e) => setFormData({ ...formData, apiType: e.target.value })}
                  placeholder="VD: vang_today"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input
                id="apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.example.com/prices"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground mt-1">Số nhỏ = ưu tiên cao</p>
              </div>
              <div>
                <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={formData.rateLimitPerMinute}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (giây)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeoutSeconds}
                  onChange={(e) => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.apiUrl}>
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
