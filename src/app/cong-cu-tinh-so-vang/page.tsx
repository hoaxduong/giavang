"use client";

import { Header } from "@/components/layout/header";
import { GoldAmountCalculator } from "@/components/calculator/gold-amount-calculator";

export default function GoldAmountCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Tính Số Vàng</h1>
          <p className="text-muted-foreground mt-2">
            Công cụ tính toán số lượng vàng mua được với số tiền VND
          </p>
        </div>
        <GoldAmountCalculator />
      </main>
    </div>
  );
}
