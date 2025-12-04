"use client";

import { Header } from "@/components/layout/header";
import { GoldCostCalculator } from "@/components/calculator/gold-cost-calculator";

export default function GoldCostCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Tính Giá Vốn Vàng
          </h1>
          <p className="text-muted-foreground mt-2">
            Công cụ tính toán giá vốn trung bình và dự báo lợi nhuận
          </p>
        </div>
        <GoldCostCalculator />
      </main>
    </div>
  );
}
