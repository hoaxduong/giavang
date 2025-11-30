'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const supabase = createClient()

      // Get user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      // Get admin count
      const { count: adminCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      // Get price snapshots count
      const { count: priceCount } = await supabase
        .from('price_snapshots')
        .select('*', { count: 'exact', head: true })

      return {
        totalUsers: userCount || 0,
        totalAdmins: adminCount || 0,
        totalPriceSnapshots: priceCount || 0,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Đang tải...</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
          <CardDescription>Tất cả người dùng đã đăng ký</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quản Trị Viên</CardTitle>
          <CardDescription>Người dùng có quyền quản trị</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalAdmins || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Bản Ghi Giá</CardTitle>
          <CardDescription>Tổng số bản ghi giá vàng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalPriceSnapshots || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}

