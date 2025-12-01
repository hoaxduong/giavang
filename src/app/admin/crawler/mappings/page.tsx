import { CrawlerMappings } from '@/components/admin/crawler/crawler-mappings'

export default function CrawlerMappingsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ánh xạ Type Code</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý ánh xạ giữa mã từ API nguồn và các thực thể nội bộ
        </p>
      </div>

      <CrawlerMappings />
    </div>
  )
}
