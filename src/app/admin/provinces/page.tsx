import { ProvincesTab } from "@/components/admin/config/provinces-tab";

export default function ProvincesPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tỉnh thành</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý danh sách các tỉnh thành
        </p>
      </div>

      <ProvincesTab />
    </div>
  );
}
