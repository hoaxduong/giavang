'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Edit, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConfigItem {
  id: string
  code: string
  name?: string
  label?: string
  short_label?: string
  is_enabled: boolean
  sort_order: number
}

interface ConfigTableProps<T extends ConfigItem> {
  title: string
  description: string
  items: T[]
  isLoading: boolean
  apiEndpoint: string
  queryKey: string
  fields: {
    code: { label: string; placeholder: string }
    name?: { label: string; placeholder: string }
    label?: { label: string; placeholder: string }
    shortLabel?: { label: string; placeholder: string }
  }
}

export function ConfigTable<T extends ConfigItem>({
  title,
  description,
  items,
  isLoading,
  apiEndpoint,
  queryKey,
  fields,
}: ConfigTableProps<T>) {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    label: '',
    shortLabel: '',
    sortOrder: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<T>) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<T> & { id: string }) => {
      const res = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiEndpoint}?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    },
  })

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    },
  })

  const resetForm = () => {
    setFormData({ code: '', name: '', label: '', shortLabel: '', sortOrder: 0 })
    setEditingItem(null)
    setError(null)
  }

  const handleOpenDialog = (item?: T) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        code: item.code,
        name: item.name || '',
        label: item.label || '',
        shortLabel: item.short_label || '',
        sortOrder: item.sort_order,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    const data: any = {
      code: formData.code,
      sortOrder: formData.sortOrder,
    }

    if (fields.name) data.name = formData.name
    if (fields.label) data.label = formData.label
    if (fields.shortLabel) data.shortLabel = formData.shortLabel

    if (editingItem) {
      updateMutation.mutate({ ...data, id: editingItem.id })
    } else {
      createMutation.mutate(data)
    }
  }

  const getDisplayName = (item: T) => {
    return item.name || item.label || item.code
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm mới
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
              <TableHead>Code</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thứ tự</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell>{getDisplayName(item)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleEnabledMutation.mutate({
                            id: item.id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge variant={item.is_enabled ? 'default' : 'secondary'}>
                        {item.is_enabled ? 'Kích hoạt' : 'Tắt'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{item.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa?')) {
                            deleteMutation.mutate(item.id)
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Chỉnh sửa' : 'Thêm mới'} {title}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Cập nhật thông tin' : 'Nhập thông tin mới'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="code">{fields.code.label}</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={fields.code.placeholder}
                disabled={!!editingItem}
              />
            </div>

            {fields.name && (
              <div>
                <Label htmlFor="name">{fields.name.label}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={fields.name.placeholder}
                />
              </div>
            )}

            {fields.label && (
              <div>
                <Label htmlFor="label">{fields.label.label}</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder={fields.label.placeholder}
                />
              </div>
            )}

            {fields.shortLabel && (
              <div>
                <Label htmlFor="shortLabel">{fields.shortLabel.label}</Label>
                <Input
                  id="shortLabel"
                  value={formData.shortLabel}
                  onChange={(e) => setFormData({ ...formData, shortLabel: e.target.value })}
                  placeholder={fields.shortLabel.placeholder}
                />
              </div>
            )}

            <div>
              <Label htmlFor="sortOrder">Thứ tự sắp xếp</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
