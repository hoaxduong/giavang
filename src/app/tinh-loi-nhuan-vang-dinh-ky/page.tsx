import { requireAuth } from "@/lib/auth/server";
import { Header } from "@/components/layout/header";
import { PortfolioClient } from "@/components/portfolio/portfolio-client";

export default async function PortfolioPage() {
  const { user, profile } = await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Danh Mục Đầu Tư</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý và theo dõi danh mục đầu tư vàng của bạn
          </p>
        </div>

        <PortfolioClient />
      </main>
    </div>
  );
}
