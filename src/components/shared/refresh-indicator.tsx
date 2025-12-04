"use client";

import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useLastUpdateTime } from "@/lib/queries/use-current-prices";
import { formatVietnameseDate } from "@/lib/utils";
import { ReloadIcon } from "@radix-ui/react-icons";

export function RefreshIndicator() {
  const lastUpdateTime = useLastUpdateTime();
  const { secondsUntilRefresh } = useAutoRefresh(lastUpdateTime);

  if (!lastUpdateTime) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ReloadIcon className="h-4 w-4 animate-spin" />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <ReloadIcon className="h-4 w-4" />
        <span>
          Cập nhật lúc: {formatVietnameseDate(lastUpdateTime, "HH:mm:ss")}
        </span>
      </div>
      <span className="text-xs">Làm mới sau {secondsUntilRefresh} giây</span>
    </div>
  );
}
