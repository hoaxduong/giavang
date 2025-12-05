"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Play, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface CrawlerSource {
  id: string;
  name: string;
  is_enabled: boolean;
}

interface SyncResult {
  success: boolean;
  results: Array<{
    source: string;
    success: boolean;
    recordsSaved: number;
    error?: string;
  }>;
  totalRecords: number;
  totalErrors: number;
  duration: number;
  timestamp: string;
}

export function CrawlerSync() {
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sources } = useQuery({
    queryKey: ["crawler-sources"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crawler/sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const json = await res.json();
      return json.sources as CrawlerSource[];
    },
  });

  const { data: sourcesStatus } = useQuery({
    queryKey: ["crawler-sources-status"],
    queryFn: async () => {
      const res = await fetch("/api/prices/sync");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (sourceId?: string) => {
      const res = await fetch("/api/prices/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to sync");
      }
      return res.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSync = () => {
    setSyncResult(null);
    setError(null);
    const sourceId = selectedSource === "all" ? undefined : selectedSource;
    syncMutation.mutate(sourceId);
  };

  return (
    <div className="space-y-6">
      {/* Manual Sync Control */}
      <Card>
        <CardHeader>
          <CardTitle>Đồng bộ thủ công</CardTitle>
          <CardDescription>
            Kích hoạt đồng bộ dữ liệu từ các nguồn crawler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nguồn</SelectItem>
                {sources
                  ?.filter((s) => s.is_enabled)
                  .map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleSync}
              loading={syncMutation.isPending}
              disabled={syncMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Đồng bộ ngay
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <Alert
              className="mt-4"
              variant={syncResult.success ? "default" : "destructive"}
            >
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    Đồng bộ {syncResult.success ? "thành công" : "thất bại"}!
                  </p>
                  <div className="text-sm space-y-1">
                    <p>• Tổng số bản ghi: {syncResult.totalRecords}</p>
                    <p>• Lỗi: {syncResult.totalErrors}</p>
                    <p>• Thời gian: {syncResult.duration}ms</p>
                  </div>
                  {syncResult.results.map((result, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>
                        {result.source}: {result.recordsSaved} bản ghi
                        {result.error && ` (${result.error})`}
                      </span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sources Status */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái nguồn</CardTitle>
          <CardDescription>
            Tình trạng đồng bộ của các nguồn dữ liệu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sourcesStatus?.sources?.map((source: any) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{source.name}</h4>
                    <Badge variant={source.isEnabled ? "default" : "secondary"}>
                      {source.isEnabled ? "Kích hoạt" : "Tắt"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {source.lastSync ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Đồng bộ lần cuối:{" "}
                          {format(
                            new Date(source.lastSync),
                            "dd/MM/yyyy HH:mm",
                            { locale: vi }
                          )}
                        </div>
                        <div>Tỷ lệ thành công: {source.successRate}%</div>
                      </>
                    ) : (
                      <span>Chưa đồng bộ lần nào</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
