"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { portfolioStorage } from "@/lib/portfolio-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCsv, parseImportFile } from "@/lib/excel-utils";
import { PortfolioForm } from "./portfolio-form";
import { PortfolioTable } from "./portfolio-table";
import { PortfolioStats } from "./portfolio-stats";
import { PortfolioGrowthChart } from "./portfolio-growth-chart";
import type { PortfolioEntry } from "@/lib/types";

export function PortfolioClient() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PortfolioEntry | null>(null);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: PortfolioEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleExport = (type: "json" | "excel" | "csv") => {
    const portfolio = portfolioStorage.getPortfolio();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `giavang-portfolio-${timestamp}`;

    if (type === "excel") {
      exportToExcel(portfolio, filename);
    } else if (type === "csv") {
      exportToCsv(portfolio, filename);
    } else {
      const json = portfolioStorage.exportPortfolio();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let entries: PortfolioEntry[] = [];

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        entries = JSON.parse(text);
      } else {
        entries = await parseImportFile(file);
      }

      if (Array.isArray(entries)) {
        portfolioStorage.importPortfolio(entries);
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio", "growth"] });
        alert("Nhập dữ liệu thành công!");
      } else {
        alert("File không hợp lệ (không phải danh sách)");
      }
    } catch (error) {
      console.error("Import failed", error);
      alert(
        "Lỗi khi đọc file: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Thống Kê Danh Mục
          </h2>
          <p className="text-muted-foreground mt-1">
            Tổng quan về danh mục đầu tư vàng của bạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json, .csv, .xlsx, .xls"
            onChange={handleFileChange}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Xuất Dữ Liệu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                JSON (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={handleImportClick}>
            Nhập Dữ Liệu
          </Button>
          <Button onClick={handleAddNew}>Thêm Giao Dịch</Button>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Cập Nhật Giao Dịch" : "Thêm Giao Dịch"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? "Chỉnh sửa thông tin giao dịch"
                : "Thêm giao dịch mới vào danh mục đầu tư"}
            </DialogDescription>
          </DialogHeader>
          <PortfolioForm
            entry={editingEntry}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            inModal={true}
          />
        </DialogContent>
      </Dialog>

      <PortfolioStats />

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          Danh Sách Giao Dịch
        </h2>
        <PortfolioTable onEdit={handleEdit} />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          Biểu Đồ Tăng Trưởng
        </h2>
        <PortfolioGrowthChart />
      </div>
    </div>
  );
}
