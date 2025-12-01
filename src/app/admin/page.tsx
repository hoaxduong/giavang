import { AdminStats } from '@/components/admin/admin-stats'

export default async function AdminPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground mt-2">
          Thống kê tổng quan hệ thống
        </p>
      </div>

      <AdminStats />
    </div>
  )
}

