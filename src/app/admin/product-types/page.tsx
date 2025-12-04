import { ProductTypesTab } from "@/components/admin/config/product-types-tab";

export default function ProductTypesPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Loại vàng</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý danh sách các loại vàng
        </p>
      </div>

      <ProductTypesTab />
    </div>
  );
}
