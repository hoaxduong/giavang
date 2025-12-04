import { BackfillManager } from "@/components/admin/crawler/backfill/backfill-manager";

export default function BackfillPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Thu thập lịch sử</h1>
        <p className="text-muted-foreground mt-2">
          Thu thập dữ liệu lịch sử từ các nguồn dữ liệu
        </p>
      </div>

      <BackfillManager />
    </div>
  );
}
