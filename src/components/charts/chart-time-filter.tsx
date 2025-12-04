"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "@/lib/constants";

interface ChartTimeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function ChartTimeFilter({ value, onChange }: ChartTimeFilterProps) {
  return (
    <Tabs value={value} onValueChange={(val) => onChange(val as TimeRange)}>
      <TabsList>
        <TabsTrigger value="day">Ngày</TabsTrigger>
        <TabsTrigger value="week">Tuần</TabsTrigger>
        <TabsTrigger value="month">Tháng</TabsTrigger>
        <TabsTrigger value="quarter">3 Tháng</TabsTrigger>
        <TabsTrigger value="year">Năm</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
