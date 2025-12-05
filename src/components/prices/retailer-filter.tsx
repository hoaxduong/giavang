"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RETAILERS } from "@/lib/constants";
import type { Retailer } from "@/lib/constants";

interface RetailerFilterProps {
  value?: Retailer;
  onValueChange: (value: Retailer | undefined) => void;
}

export function RetailerFilter({ value, onValueChange }: RetailerFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onValueChange(val as Retailer)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Chọn Nhà Bán" />
      </SelectTrigger>
      <SelectContent>
        {RETAILERS.map((retailer) => (
          <SelectItem key={retailer} value={retailer}>
            {retailer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
