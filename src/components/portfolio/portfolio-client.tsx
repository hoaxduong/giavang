"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PortfolioForm } from "./portfolio-form";
import { PortfolioTable } from "./portfolio-table";
import { PortfolioStats } from "./portfolio-stats";
import { PortfolioGrowthChart } from "./portfolio-growth-chart";
import type { PortfolioEntry } from "@/lib/types";

export function PortfolioClient() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PortfolioEntry | null>(null);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Thống Kê Danh Mục
          </h2>
          <p className="text-muted-foreground mt-1">
            Tổng quan về danh mục đầu tư vàng của bạn
          </p>
        </div>
        <Button onClick={handleAddNew}>Thêm Giao Dịch</Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
