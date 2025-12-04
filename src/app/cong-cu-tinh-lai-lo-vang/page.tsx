"use client";

import { Header } from "@/components/layout/header";
import { GoldProfitLossCalculator } from "@/components/calculator/gold-profit-loss-calculator";

export default function GoldProfitLossCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Tính Lãi/Lỗ Vàng
          </h1>
          <p className="text-muted-foreground mt-2">
            Công cụ tính toán lợi nhuận, tỷ suất sinh lợi hàng năm (APY) và theo
            dõi hiệu suất đầu tư vàng
          </p>
        </div>
        <GoldProfitLossCalculator />
      </main>
    </div>
  );
}
