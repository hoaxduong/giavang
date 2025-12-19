import * as XLSX from "xlsx";
import type { PortfolioEntry } from "./types";
import { RETAILERS, PROVINCES } from "./constants";

// Mapping for user-friendly column headers
const COLUMN_MAP: Record<string, string> = {
  amount: "Số Lượng (chỉ)",
  retailer: "Nhà Bán",
  productName: "Sản Phẩm",
  province: "Tỉnh/TP",
  bought_at: "Ngày Mua",
  buy_price: "Giá Mua (VNĐ)",
  sold_at: "Ngày Bán",
  sell_price: "Giá Bán (VNĐ)",
  id: "ID (Không sửa)",
};

const REVERSE_COLUMN_MAP: Record<string, keyof PortfolioEntry> = Object.entries(
  COLUMN_MAP
).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});

export const exportToExcel = (data: PortfolioEntry[], filename: string) => {
  const exportData = data.map((entry) => ({
    [COLUMN_MAP.id]: entry.id,
    [COLUMN_MAP.amount]: entry.amount,
    [COLUMN_MAP.retailer]: entry.retailer,
    [COLUMN_MAP.productName]: entry.productName,
    [COLUMN_MAP.province]: entry.province || "",
    [COLUMN_MAP.buy_price]: entry.buy_price || 0,
    [COLUMN_MAP.bought_at]: entry.bought_at,
    [COLUMN_MAP.sell_price]: entry.sell_price || "",
    [COLUMN_MAP.sold_at]: entry.sold_at || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCsv = (data: PortfolioEntry[], filename: string) => {
  const exportData = data.map((entry) => ({
    [COLUMN_MAP.id]: entry.id,
    [COLUMN_MAP.amount]: entry.amount,
    [COLUMN_MAP.retailer]: entry.retailer,
    [COLUMN_MAP.productName]: entry.productName,
    [COLUMN_MAP.province]: entry.province || "",
    [COLUMN_MAP.buy_price]: entry.buy_price || 0,
    [COLUMN_MAP.bought_at]: entry.bought_at,
    [COLUMN_MAP.sell_price]: entry.sell_price || "",
    [COLUMN_MAP.sold_at]: entry.sold_at || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseImportFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map back to PortfolioEntry keys
        const parsedData = jsonData.map((row: any) => {
          const entry: any = {
            // Generate temp ID if missing (will be replaced by storage add logic if new)
            // But for import logic, we usually want to KEEP IDs if they exist to support updates?
            // Or treats as new?
            // Implementation plan said: import replaces logic or adds?
            // portfolio-storage.ts `importPortfolio` replaces EVERYTHING.
            // So we should try to keep ID if present.
            user_id: "local-user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          Object.keys(row).forEach((colName) => {
            const key = REVERSE_COLUMN_MAP[colName];
            if (key) {
              entry[key] = row[colName];
            }
          });

          return entry;
        });

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
