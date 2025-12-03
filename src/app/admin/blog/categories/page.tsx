'use client'

import { useQuery } from '@tanstack/react-query'
import { ConfigTable } from '@/components/admin/config/config-table'

interface BlogCategory {
  id: string
  slug: string
  name: string
  description?: string
  is_enabled: boolean
  sort_order: number
}

export default function BlogCategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/blog/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      const json = await res.json()
      return json.categories as BlogCategory[]
    },
  })

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Danh mục Blog</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý danh mục bài viết blog
        </p>
      </div>

      <ConfigTable<BlogCategory>
        title="Quản lý Danh mục"
        description="Quản lý danh sách danh mục blog"
        items={data || []}
        isLoading={isLoading}
        apiEndpoint="/api/admin/blog/categories"
        queryKey="blog-categories"
        fields={{
          code: {
            label: 'Slug',
            placeholder: 'VD: tin-tuc-vang, huong-dan',
          },
          name: {
            label: 'Tên danh mục',
            placeholder: 'VD: Tin tức vàng, Hướng dẫn',
          },
        }}
      />
    </div>
  )
}
