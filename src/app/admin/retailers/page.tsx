import { RetailersTab } from '@/components/admin/config/retailers-tab'

export default function RetailersPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Thương hiệu vàng</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý danh sách các thương hiệu vàng
        </p>
      </div>

      <RetailersTab />
    </div>
  )
}
