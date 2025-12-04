"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES } from "@/lib/constants";
import type { Province } from "@/lib/constants";

interface ProvinceFilterProps {
  value?: Province;
  onValueChange: (value: Province | undefined) => void;
}

export function ProvinceFilter({ value, onValueChange }: ProvinceFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) =>
        onValueChange(val === "all" ? undefined : (val as Province))
      }
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Chọn Tỉnh/TP" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả tỉnh/TP</SelectItem>
        {PROVINCES.map((province) => (
          <SelectItem key={province} value={province}>
            {province}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
