import { CrawlerLogs } from "@/components/admin/crawler/crawler-logs";

export default function CrawlerLogsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Lịch sử Crawler</h1>
        <p className="text-muted-foreground mt-2">
          Xem lịch sử và chi tiết các lần đồng bộ dữ liệu
        </p>
      </div>

      <CrawlerLogs />
    </div>
  );
}
