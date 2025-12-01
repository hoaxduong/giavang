import { UserManagement } from '@/components/admin/user-management'

export default function UsersPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Người dùng</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý người dùng và phân quyền
        </p>
      </div>

      <UserManagement />
    </div>
  )
}
