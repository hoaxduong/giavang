"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import Link from "next/link";

interface RetailerProduct {
  id: string;
  retailerCode: string;
  productCode: string;
  productName: string;

  description?: string | null;
  isEnabled: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
}

interface Retailer {
  code: string;
  name: string;
}

export function RetailerProductsManager({
  retailerCode,
}: {
  retailerCode: string;
}) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RetailerProduct | null>(
    null
  );
  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",

    description: "",
    sortOrder: 0,
    isEnabled: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch retailer info and products
  const { data, isLoading } = useQuery({
    queryKey: ["retailer-products", retailerCode],
    queryFn: async () => {
      const res = await fetch(`/api/admin/retailers/${retailerCode}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json() as Promise<{
        retailer: Retailer;
        products: RetailerProduct[];
      }>;
    },
  });

  // Create product
  const createMutation = useMutation({
    mutationFn: async (productData: {
      productCode: string;
      productName: string;

      description?: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }) => {
      const res = await fetch(`/api/admin/retailers/${retailerCode}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retailer-products", retailerCode],
      });
      setIsDialogOpen(false);
      resetForm();
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Update product
  const updateMutation = useMutation({
    mutationFn: async (data: {
      productId: string;
      updates: Partial<RetailerProduct>;
    }) => {
      const res = await fetch(
        `/api/admin/retailers/${retailerCode}/products/${data.productId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.updates),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retailer-products", retailerCode],
      });
      setIsDialogOpen(false);
      resetForm();
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Delete product
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(
        `/api/admin/retailers/${retailerCode}/products/${productId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to delete product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retailer-products", retailerCode],
      });
    },
  });

  // Toggle enabled
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({
      productId,
      isEnabled,
    }: {
      productId: string;
      isEnabled: boolean;
    }) => {
      const res = await fetch(
        `/api/admin/retailers/${retailerCode}/products/${productId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled }),
        }
      );
      if (!res.ok) throw new Error("Failed to toggle status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retailer-products", retailerCode],
      });
    },
  });

  const resetForm = () => {
    setFormData({
      productCode: "",
      productName: "",

      description: "",
      sortOrder: 0,
      isEnabled: true,
    });
    setEditingProduct(null);
    setError(null);
  };

  const handleOpenDialog = (product?: RetailerProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        productCode: product.productCode,
        productName: product.productName,

        description: product.description || "",
        sortOrder: product.sortOrder,
        isEnabled: product.isEnabled,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    setError(null);

    const productData = {
      productCode: formData.productCode,
      productName: formData.productName,

      description: formData.description || null,
      sortOrder: formData.sortOrder,
      isEnabled: formData.isEnabled,
    };

    if (editingProduct) {
      updateMutation.mutate({
        productId: editingProduct.id,
        updates: productData,
      });
    } else {
      createMutation.mutate(productData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/retailers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">
              Sản phẩm {data?.retailer.name || retailerCode}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý danh mục sản phẩm cho thương hiệu này
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã sản phẩm</TableHead>
              <TableHead>Tên sản phẩm</TableHead>

              <TableHead>Trạng thái</TableHead>
              <TableHead>Thứ tự</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.products || data.products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Chưa có sản phẩm nào. Nhấn &quot;Thêm sản phẩm&quot; để bắt
                  đầu.
                </TableCell>
              </TableRow>
            ) : (
              data.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">
                    {product.productCode}
                  </TableCell>
                  <TableCell className="font-medium">
                    {product.productName}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.isEnabled}
                        loading={
                          toggleEnabledMutation.isPending &&
                          toggleEnabledMutation.variables?.productId ===
                            product.id
                        }
                        onCheckedChange={(checked) =>
                          toggleEnabledMutation.mutate({
                            productId: product.id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge
                        variant={product.isEnabled ? "default" : "secondary"}
                      >
                        {product.isEnabled ? "Kích hoạt" : "Tắt"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{product.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            confirm(
                              "Bạn có chắc muốn xóa sản phẩm này? Thao tác này không thể hoàn tác."
                            )
                          ) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        loading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === product.id
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Cập nhật thông tin sản phẩm"
                : "Nhập thông tin sản phẩm mới cho thương hiệu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="productCode">
                Mã sản phẩm <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={(e) =>
                  setFormData({ ...formData, productCode: e.target.value })
                }
                placeholder="VD: MIENG_1L, NHAN_9999"
                disabled={!!editingProduct}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mã duy nhất cho sản phẩm này (chữ in hoa, gạch dưới)
              </p>
            </div>

            <div>
              <Label htmlFor="productName">
                Tên sản phẩm <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder="VD: Vàng miếng SJC theo lượng"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tên hiển thị chính xác từ thương hiệu
              </p>
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Mô tả chi tiết về sản phẩm (tuỳ chọn)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sortOrder">Thứ tự sắp xếp</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isEnabled: checked })
                  }
                />
                <Label htmlFor="isEnabled">Kích hoạt sản phẩm</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!formData.productCode || !formData.productName}
            >
              {editingProduct ? "Cập nhật" : "Thêm sản phẩm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
