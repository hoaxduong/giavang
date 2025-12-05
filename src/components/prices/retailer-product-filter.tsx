"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRetailerProducts } from "@/lib/queries/use-retailer-products";
import type { Retailer } from "@/lib/constants";

interface RetailerProductFilterProps {
  retailer?: Retailer;
  value?: string;
  onValueChange: (value: string | undefined) => void;
}

export function RetailerProductFilter({
  retailer,
  value,
  onValueChange,
}: RetailerProductFilterProps) {
  const { data, isLoading } = useRetailerProducts(retailer);

  // If filtered by retailer but there are no products, or still loading
  const isDisabled = isLoading;

  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onValueChange(val)}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Chọn Sản Phẩm" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả sản phẩm</SelectItem>
        {data?.data.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            {product.productName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
