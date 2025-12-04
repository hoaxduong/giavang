"use client";

import { useQuery } from "@tanstack/react-query";
import { ConfigTable } from "./config-table";

interface Province {
  id: string;
  code: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
}

export function ProvincesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const res = await fetch("/api/admin/provinces");
      if (!res.ok) throw new Error("Failed to fetch provinces");
      const json = await res.json();
      return json.provinces as Province[];
    },
  });

  return (
    <ConfigTable<Province>
      title="Quản lý Tỉnh thành"
      description="Quản lý danh sách các tỉnh thành"
      items={data || []}
      isLoading={isLoading}
      apiEndpoint="/api/admin/provinces"
      queryKey="provinces"
      fields={{
        code: {
          label: "Mã tỉnh thành",
          placeholder: "VD: TP. Hồ Chí Minh, Hà Nội",
        },
        name: {
          label: "Tên tỉnh thành",
          placeholder: "VD: TP. Hồ Chí Minh, Hà Nội",
        },
      }}
    />
  );
}
