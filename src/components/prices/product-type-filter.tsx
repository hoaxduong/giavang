"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_TYPES } from "@/lib/constants";
import type { ProductType } from "@/lib/constants";

interface ProductTypeFilterProps {
  value?: ProductType;
  onValueChange: (value: ProductType | undefined) => void;
}

export function ProductTypeFilter({
  value,
  onValueChange,
}: ProductTypeFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) =>
        onValueChange(val === "all" ? undefined : (val as ProductType))
      }
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Chọn Loại Vàng" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả loại vàng</SelectItem>
        {PRODUCT_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
