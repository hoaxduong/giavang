"use client";

import { useQuery } from "@tanstack/react-query";
import { ConfigTable } from "./config-table";

interface Retailer {
  id: string;
  code: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
}

export function RetailersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["retailers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/retailers");
      if (!res.ok) throw new Error("Failed to fetch retailers");
      const json = await res.json();
      return json.retailers as Retailer[];
    },
  });

  return (
    <ConfigTable<Retailer>
      title="Quản lý Thương hiệu"
      description="Quản lý danh sách các thương hiệu vàng"
      items={data || []}
      isLoading={isLoading}
      apiEndpoint="/api/admin/retailers"
      queryKey="retailers"
      fields={{
        code: {
          label: "Mã thương hiệu",
          placeholder: "VD: SJC, DOJI, PNJ",
        },
        name: {
          label: "Tên thương hiệu",
          placeholder: "VD: SJC, DOJI, PNJ",
        },
      }}
    />
  );
}
