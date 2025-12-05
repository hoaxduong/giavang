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
  value?: Province | string;
  onValueChange: (value: Province | string | undefined) => void;
}

export function ProvinceFilter({ value, onValueChange }: ProvinceFilterProps) {
  return (
    <Select
      value={value === "" ? "__empty__" : value || "all"}
      onValueChange={(val) => {
        if (val === "all") onValueChange(undefined);
        else if (val === "__empty__") onValueChange("");
        else onValueChange(val as Province | string);
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Chọn Tỉnh/TP" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả tỉnh/TP</SelectItem>
        <SelectItem value="__empty__">Khác (Không xác định)</SelectItem>
        {PROVINCES.map((province) => (
          <SelectItem key={province} value={province}>
            {province}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
