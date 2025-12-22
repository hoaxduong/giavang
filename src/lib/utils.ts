import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as formatDate, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CURRENCY_CONFIG } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Vietnamese Dong
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: "currency",
    currency: CURRENCY_CONFIG.currency,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
  }).format(amount);
}

/**
 * Format currency compact (e.g., 1.5M instead of 1,500,000)
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}tr`; // triệu
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k`; // nghìn
  }
  return amount.toString();
}

/**
 * Format currency in US Dollars
 */
export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date with Vietnamese locale
 */
export function formatVietnameseDate(
  date: Date | string,
  formatString: string = "PPP"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return typeof date === "string" ? date : "Ngày không hợp lệ";
  }

  return formatDate(dateObj, formatString, { locale: vi });
}

/**
 * Format relative time in human-readable format (e.g., "2 giờ trước", "5 phút trước")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return "Không xác định";
  }

  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: vi,
  });
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Get price trend direction
 */
export function getPriceTrend(change: number): "up" | "down" | "stable" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "stable";
}

/**
 * Format retailer name for display
 * Converts empty retailer code to display name
 */
// ... existing code ...
export function formatRetailerName(retailerCode: string): string {
  if (retailerCode === "" || !retailerCode) {
    return "Giá Vàng Thế Giới";
  }
  return retailerCode;
}

/**
 * Normalize price to VND per "chỉ" (3.75g)
 * Most gold prices often quote in "lượng" (tael = 10 chỉ)
 */
export function normalizePriceToVndPerChi(price: number, unit: string): number {
  if (!unit) return price;

  const lowerUnit = unit.toLowerCase();

  // 1 lượng (tael) = 1 cây = 10 chỉ
  if (
    lowerUnit.includes("lượng") ||
    lowerUnit.includes("luong") ||
    lowerUnit.includes("cây") ||
    lowerUnit.includes("cay")
  ) {
    return price / 10;
  }

  // 1 kg = 26.666666666667 lượng = 266.66666666667 chỉ
  // But usually prices are 1000x or 1,000,000x, let's just handle Lượng vs Chỉ for now.

  // HEURISTIC: If unit indicates "Chỉ" but price is abnormally high (> 50,000,000),
  // it is likely actually in "Lượng" (or just raw per tael price) but mislabeled.
  // Current gold price ~8-9M/chỉ (80-90M/lượng).
  // If price > 50M, it's definitely not per chỉ.
  if (
    (lowerUnit === "vnd/chi" || lowerUnit === "vnd/chỉ") &&
    price > 50000000
  ) {
    return price / 10;
  }

  return price;
}
