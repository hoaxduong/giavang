import { CrawlerSync } from "@/components/admin/crawler/crawler-sync";

export default function CrawlerSyncPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Đồng bộ dữ liệu</h1>
        <p className="text-muted-foreground mt-2">
          Kích hoạt đồng bộ dữ liệu từ các nguồn crawler
        </p>
      </div>

      <CrawlerSync />
    </div>
  );
}
