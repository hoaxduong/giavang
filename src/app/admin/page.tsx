import { requireRole } from '@/lib/auth/server'
import { Header } from '@/components/layout/header'
import { UserManagement } from '@/components/admin/user-management'
import { AdminStats } from '@/components/admin/admin-stats'

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Quản Trị</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý hệ thống và người dùng
          </p>
        </div>

        <div className="space-y-8">
          <AdminStats />
          <UserManagement />
        </div>
      </main>
    </div>
  )
}

