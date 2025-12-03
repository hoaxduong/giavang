'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, AlertTriangle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export function CommentModerator() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('pending')

  const { data, isLoading } = useQuery({
    queryKey: ['blog-comments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const res = await fetch(`/api/admin/blog/comments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      const json = await res.json()
      return json.comments
    },
  })

  const moderateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/blog/comments/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to moderate comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/comments?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments'] })
    },
  })

  const handleModerate = (id: string, status: string) => {
    moderateMutation.mutate({ id, status })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return
    deleteMutation.mutate(id)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Đã duyệt</Badge>
      case 'pending':
        return <Badge variant="secondary">Chờ duyệt</Badge>
      case 'rejected':
        return <Badge variant="destructive">Từ chối</Badge>
      case 'spam':
        return <Badge variant="outline">Spam</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bài viết</TableHead>
              <TableHead>Người gửi</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
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
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có bình luận
                </TableCell>
              </TableRow>
            ) : (
              data.map((comment: any) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    <Link
                      href={`/blog/${comment.post?.slug}`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      {truncateText(comment.post?.title || 'N/A', 30)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {comment.author?.fullName || comment.authorName || 'Anonymous'}
                      </div>
                      {comment.author?.email && (
                        <div className="text-xs text-muted-foreground">
                          {comment.author.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {truncateText(comment.content, 100)}
                  </TableCell>
                  <TableCell>{getStatusBadge(comment.status)}</TableCell>
                  <TableCell>
                    {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {comment.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerate(comment.id, 'approved')}
                          title="Duyệt"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {comment.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerate(comment.id, 'rejected')}
                          title="Từ chối"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      {comment.status !== 'spam' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerate(comment.id, 'spam')}
                          title="Đánh dấu spam"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(comment.id)}
                        title="Xóa"
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
    </div>
  )
}
