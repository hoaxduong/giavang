"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCreateBackfillJob } from "@/hooks/use-backfill";
import { Loader2 } from "lucide-react";

interface BackfillFormsProps {
  onJobCreated?: () => void;
}

export function BackfillForms({ onJobCreated }: BackfillFormsProps) {
  const { toast } = useToast();
  const createJobMutation = useCreateBackfillJob();
  const [jobType, setJobType] = useState<"full_historical" | "date_range">(
    "full_historical"
  );

  // Fetch sources
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["crawler-sources"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crawler/sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      return data.sources || [];
    },
  });

  // Full Historical form state
  const [fullHistoricalData, setFullHistoricalData] = useState({
    sourceId: "",
    days: 30,
    typesMode: "all" as "all" | "specific",
    selectedTypes: [] as string[],
    executeImmediately: true,
  });

  // Date Range form state
  const [dateRangeData, setDateRangeData] = useState({
    sourceId: "",
    startDate: "",
    endDate: "",
    typesMode: "all" as "all" | "specific",
    selectedTypes: [] as string[],
    executeImmediately: true,
  });

  const handleFullHistoricalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createJobMutation.mutateAsync({
        jobType: "full_historical",
        sourceId: fullHistoricalData.sourceId,
        config: {
          days: fullHistoricalData.days,
          types:
            fullHistoricalData.typesMode === "all"
              ? "all"
              : fullHistoricalData.selectedTypes,
        },
        executeImmediately: fullHistoricalData.executeImmediately,
      });

      toast({
        title: "Thành công",
        description: "Công việc đã được tạo và bắt đầu thực thi",
      });

      onJobCreated?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể tạo công việc",
        variant: "destructive",
      });
    }
  };

  const handleDateRangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createJobMutation.mutateAsync({
        jobType: "date_range",
        sourceId: dateRangeData.sourceId,
        config: {
          startDate: dateRangeData.startDate,
          endDate: dateRangeData.endDate,
          types:
            dateRangeData.typesMode === "all"
              ? "all"
              : dateRangeData.selectedTypes,
        },
        executeImmediately: dateRangeData.executeImmediately,
      });

      toast({
        title: "Thành công",
        description: "Công việc đã được tạo và bắt đầu thực thi",
      });

      onJobCreated?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể tạo công việc",
        variant: "destructive",
      });
    }
  };

  if (sourcesLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Full Historical Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thu thập toàn bộ lịch sử</CardTitle>
          <CardDescription>
            Thu thập dữ liệu lịch sử từ nguồn dữ liệu (mặc định: 30 ngày)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFullHistoricalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fh-source">Nguồn dữ liệu</Label>
              <Select
                value={fullHistoricalData.sourceId}
                onValueChange={(value) =>
                  setFullHistoricalData({
                    ...fullHistoricalData,
                    sourceId: value,
                  })
                }
              >
                <SelectTrigger id="fh-source">
                  <SelectValue placeholder="Chọn nguồn" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map((source: any) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fh-days">Số ngày</Label>
              <Input
                id="fh-days"
                type="number"
                min="1"
                placeholder="30"
                value={fullHistoricalData.days}
                onChange={(e) =>
                  setFullHistoricalData({
                    ...fullHistoricalData,
                    days: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Loại dữ liệu</Label>
              <RadioGroup
                value={fullHistoricalData.typesMode}
                onValueChange={(value: "all" | "specific") =>
                  setFullHistoricalData({
                    ...fullHistoricalData,
                    typesMode: value,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="fh-all" />
                  <Label htmlFor="fh-all" className="font-normal">
                    Tất cả loại
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="fh-specific" />
                  <Label htmlFor="fh-specific" className="font-normal">
                    Chọn loại cụ thể
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="fh-execute"
                checked={fullHistoricalData.executeImmediately}
                onCheckedChange={(checked) =>
                  setFullHistoricalData({
                    ...fullHistoricalData,
                    executeImmediately: checked as boolean,
                  })
                }
              />
              <Label htmlFor="fh-execute" className="font-normal">
                Thực thi ngay lập tức
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={
                createJobMutation.isPending && jobType === "full_historical"
              }
              disabled={
                !fullHistoricalData.sourceId || createJobMutation.isPending
              }
            >
              Bắt đầu thu thập
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Date Range Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thu thập theo khoảng thời gian</CardTitle>
          <CardDescription>
            Thu thập dữ liệu trong khoảng thời gian cụ thể
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDateRangeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dr-source">Nguồn dữ liệu</Label>
              <Select
                value={dateRangeData.sourceId}
                onValueChange={(value) =>
                  setDateRangeData({ ...dateRangeData, sourceId: value })
                }
              >
                <SelectTrigger id="dr-source">
                  <SelectValue placeholder="Chọn nguồn" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map((source: any) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dr-start">Ngày bắt đầu</Label>
                <Input
                  id="dr-start"
                  type="date"
                  value={dateRangeData.startDate}
                  onChange={(e) =>
                    setDateRangeData({
                      ...dateRangeData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dr-end">Ngày kết thúc</Label>
                <Input
                  id="dr-end"
                  type="date"
                  value={dateRangeData.endDate}
                  onChange={(e) =>
                    setDateRangeData({
                      ...dateRangeData,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loại dữ liệu</Label>
              <RadioGroup
                value={dateRangeData.typesMode}
                onValueChange={(value: "all" | "specific") =>
                  setDateRangeData({ ...dateRangeData, typesMode: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="dr-all" />
                  <Label htmlFor="dr-all" className="font-normal">
                    Tất cả loại
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="dr-specific" />
                  <Label htmlFor="dr-specific" className="font-normal">
                    Chọn loại cụ thể
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dr-execute"
                checked={dateRangeData.executeImmediately}
                onCheckedChange={(checked) =>
                  setDateRangeData({
                    ...dateRangeData,
                    executeImmediately: checked as boolean,
                  })
                }
              />
              <Label htmlFor="dr-execute" className="font-normal">
                Thực thi ngay lập tức
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={createJobMutation.isPending && jobType === "date_range"}
              disabled={
                !dateRangeData.sourceId ||
                !dateRangeData.startDate ||
                !dateRangeData.endDate ||
                createJobMutation.isPending
              }
            >
              Bắt đầu thu thập
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
