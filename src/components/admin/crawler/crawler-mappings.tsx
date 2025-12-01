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
import { Edit, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TypeMapping {
  id: string
  source_id: string
  external_code: string
  retailer_code: string
  product_type_code: string
  province_code: string | null
  label: string
  is_enabled: boolean
}

export function CrawlerMappings() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TypeMapping | null>(null)
  const [formData, setFormData] = useState({
    sourceId: '',
    externalCode: '',
    retailerCode: '',
    productTypeCode: '',
    provinceCode: '',
    label: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch mappings
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['crawler-mappings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/crawler/mappings')
      if (!res.ok) throw new Error('Failed to fetch mappings')
      const json = await res.json()
      return json.mappings as TypeMapping[]
    },
  })

  // Fetch sources for dropdown
  const { data: sources } = useQuery({
    queryKey: ['crawler-sources'],
    queryFn: async () => {
      const res = await fetch('/api/admin/crawler/sources')
      if (!res.ok) throw new Error('Failed to fetch sources')
      const json = await res.json()
      return json.sources
    },
  })

  // Fetch retailers for dropdown
  const { data: retailers } = useQuery({
    queryKey: ['retailers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/retailers')
      if (!res.ok) throw new Error('Failed to fetch retailers')
      const json = await res.json()
      return json.retailers
    },
  })

  // Fetch provinces for dropdown
  const { data: provinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const res = await fetch('/api/admin/provinces')
      if (!res.ok) throw new Error('Failed to fetch provinces')
      const json = await res.json()
      return json.provinces
    },
  })

  // Fetch product types for dropdown
  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: async () => {
      const res = await fetch('/api/admin/product-types')
      if (!res.ok) throw new Error('Failed to fetch product types')
      const json = await res.json()
      return json.productTypes
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/crawler/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create mapping')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-mappings'] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/crawler/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update mapping')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-mappings'] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/crawler/mappings?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete mapping')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-mappings'] })
    },
  })

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/admin/crawler/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-mappings'] })
    },
  })

  const resetForm = () => {
    setFormData({
      sourceId: '',
      externalCode: '',
      retailerCode: '',
      productTypeCode: '',
      provinceCode: '',
      label: '',
    })
    setEditingItem(null)
    setError(null)
  }

  const handleOpenDialog = (item?: TypeMapping) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        sourceId: item.source_id,
        externalCode: item.external_code,
        retailerCode: item.retailer_code,
        productTypeCode: item.product_type_code,
        provinceCode: item.province_code || '',
        label: item.label,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    const data = {
      sourceId: formData.sourceId,
      externalCode: formData.externalCode,
      retailerCode: formData.retailerCode,
      productTypeCode: formData.productTypeCode,
      provinceCode: formData.provinceCode || null,
      label: formData.label,
    }

    if (editingItem) {
      updateMutation.mutate({ ...data, id: editingItem.id })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ánh xạ Type Code</h3>
          <p className="text-sm text-muted-foreground">
            Ánh xạ giữa mã từ API nguồn và các thực thể nội bộ
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm ánh xạ
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
              <TableHead>External Code</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Retailer</TableHead>
              <TableHead>Product Type</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !mappings || mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chưa có ánh xạ
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-mono">{mapping.external_code}</TableCell>
                  <TableCell>{mapping.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.retailer_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.product_type_code}</Badge>
                  </TableCell>
                  <TableCell>
                    {mapping.province_code ? (
                      <Badge variant="outline">{mapping.province_code}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={mapping.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleEnabledMutation.mutate({
                            id: mapping.id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge variant={mapping.is_enabled ? 'default' : 'secondary'}>
                        {mapping.is_enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(mapping)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa ánh xạ này?')) {
                            deleteMutation.mutate(mapping.id)
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
              {editingItem ? 'Chỉnh sửa' : 'Thêm'} ánh xạ
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="source">Nguồn dữ liệu *</Label>
              <Select
                value={formData.sourceId}
                onValueChange={(value) => setFormData({ ...formData, sourceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nguồn" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map((source: any) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="externalCode">External Code *</Label>
                <Input
                  id="externalCode"
                  value={formData.externalCode}
                  onChange={(e) => setFormData({ ...formData, externalCode: e.target.value })}
                  placeholder="VD: SJL1L10, DOHNL"
                />
              </div>
              <div>
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="VD: Vàng SJC 1 lượng"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="retailer">Retailer *</Label>
                <Select
                  value={formData.retailerCode}
                  onValueChange={(value) => setFormData({ ...formData, retailerCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers?.map((retailer: any) => (
                      <SelectItem key={retailer.id} value={retailer.code}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="productType">Product Type *</Label>
                <Select
                  value={formData.productTypeCode}
                  onValueChange={(value) => setFormData({ ...formData, productTypeCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes?.map((pt: any) => (
                      <SelectItem key={pt.id} value={pt.code}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="province">Province</Label>
                <Select
                  value={formData.provinceCode}
                  onValueChange={(value) => setFormData({ ...formData, provinceCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Không chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Không chọn</SelectItem>
                    {provinces?.map((province: any) => (
                      <SelectItem key={province.id} value={province.code}>
                        {province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.sourceId ||
                !formData.externalCode ||
                !formData.retailerCode ||
                !formData.productTypeCode ||
                !formData.label
              }
            >
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
