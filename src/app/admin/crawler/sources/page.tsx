import { CrawlerSources } from '@/components/admin/crawler/crawler-sources'

export default function CrawlerSourcesPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nguồn dữ liệu Crawler</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý các API nguồn để thu thập giá vàng tự động
        </p>
      </div>

      <CrawlerSources />
    </div>
  )
}
