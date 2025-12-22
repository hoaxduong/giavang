import * as XLSX from "xlsx";
import { parse, isValid } from "date-fns";
import type { PortfolioEntry } from "./types";

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

// Normalize string for fuzzy matching (lowercase, trim, remove extra spaces)
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

// Create a map of normalized headers to keys
const NORMALIZED_REVERSE_MAP: Record<string, keyof PortfolioEntry> =
  Object.entries(COLUMN_MAP).reduce(
    (acc, [key, value]) => ({ ...acc, [normalizeHeader(value)]: key }),
    {}
  );

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

// Helper: Attempt to parse multiple date formats
function parseDateString(dateStr: string | number): string | undefined {
  if (!dateStr) return undefined;

  // If already matches ISO start (e.g. 2024-12-25...), just assume it's valid for now
  // or checks if it is a valid date directly
  const simpleDate = new Date(dateStr);
  if (isValid(simpleDate) && dateStr.toString().includes("-")) {
    return simpleDate.toISOString();
  }

  const str = dateStr.toString().trim();
  const formatsToTry = [
    "dd/MM/yyyy",
    "dd/MM/yyyy HH:mm",
    "dd-MM-yyyy",
    "yyyy-MM-dd",
    "MM/dd/yyyy", // unlikely in VN, but possible
    "d/M/yyyy",
  ];

  for (const fmt of formatsToTry) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }

  // Fallback: see if standard Date constructor works for other formats
  const fallback = new Date(str);
  if (isValid(fallback)) {
    return fallback.toISOString();
  }

  return undefined; // Could not parse
}

export const parseImportFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Use 'array' or 'buffer' type for ArrayBuffer
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map back to PortfolioEntry keys
        const parsedData = jsonData.map((row: any) => {
          const entry: any = {
            // Generate temp ID if missing (will be replaced by storage add logic if new)
            // But for import logic, we usually want to KEEP IDs if they exist to support updates?
            // Or treats as new?
            // portfolio-storage.ts `importPortfolio` replaces EVERYTHING.
            // So we should try to keep ID if present.
            user_id: "local-user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          Object.keys(row).forEach((colName) => {
            const normalizedCol = normalizeHeader(colName);
            const key = NORMALIZED_REVERSE_MAP[normalizedCol];

            if (key) {
              let value = row[colName];

              // Handle Date Conversions
              if (key === "bought_at" || key === "sold_at") {
                const parsed = parseDateString(value);
                // If parsed is undefined, maybe keep original value so user sees it's broken?
                // Or keep it undefined? If undefined, app might crash if it expects string.
                // Let's use current time as extreme fallback or just keep invalid string?
                // Better to put undefined so it doesn't crash Date constructor immediately,
                // but types say string.
                if (parsed) {
                  value = parsed;
                }
              }

              entry[key] = value;
            }
          });

          // Ensure bought_at is present, otherwise invalid entry
          if (!entry.bought_at) {
            entry.bought_at = new Date().toISOString();
          }

          return entry;
        });

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
