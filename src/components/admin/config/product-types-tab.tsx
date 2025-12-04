"use client";

import { useQuery } from "@tanstack/react-query";
import { ConfigTable } from "./config-table";

interface ProductType {
  id: string;
  code: string;
  label: string;
  short_label: string;
  is_enabled: boolean;
  sort_order: number;
}

export function ProductTypesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const res = await fetch("/api/admin/product-types");
      if (!res.ok) throw new Error("Failed to fetch product types");
      const json = await res.json();
      return json.productTypes as ProductType[];
    },
  });

  return (
    <ConfigTable<ProductType>
      title="Quản lý Loại vàng"
      description="Quản lý danh sách các loại vàng"
      items={data || []}
      isLoading={isLoading}
      apiEndpoint="/api/admin/product-types"
      queryKey="product-types"
      fields={{
        code: {
          label: "Mã loại vàng",
          placeholder: "VD: SJC_BARS, GOLD_9999",
        },
        label: {
          label: "Tên đầy đủ",
          placeholder: "VD: Vàng miếng SJC, Vàng 9999",
        },
        shortLabel: {
          label: "Tên rút gọn",
          placeholder: "VD: Miếng SJC, 9999",
        },
      }}
    />
  );
}
