"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RETAILERS, PROVINCES } from "@/lib/constants";
import { useCurrentPrices } from "@/lib/queries/use-current-prices";
import {
  useCreatePortfolioEntry,
  useUpdatePortfolioEntry,
} from "@/lib/queries/use-portfolio";
import {
  portfolioFormSchema,
  type PortfolioFormData,
} from "@/lib/schemas/portfolio";
import type { PortfolioEntry } from "@/lib/types";

interface PortfolioFormProps {
  entry?: PortfolioEntry | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

export function PortfolioForm({
  entry,
  onSuccess,
  onCancel,
  inModal = false,
}: PortfolioFormProps) {
  const isEditing = !!entry;

  const createMutation = useCreatePortfolioEntry();
  const updateMutation = useUpdatePortfolioEntry();
  const { data: currentPrices } = useCurrentPrices();

  const availableProducts = useMemo(() => {
    if (!currentPrices?.data) return [];
    const names = new Set(
      currentPrices.data.map((p) => p.product_name).filter(Boolean)
    );
    return Array.from(names).sort() as string[];
  }, [currentPrices]);

  const getDefaultValues = () => {
    if (entry) {
      // Convert ISO string to datetime-local format
      const boughtAtDate = new Date(entry.bought_at);
      const localDateTime = new Date(
        boughtAtDate.getTime() - boughtAtDate.getTimezoneOffset() * 60000
      );
      return {
        amount: entry.amount,
        retailer: entry.retailer,
        productName: entry.productName,
        province: entry.province || null,
        bought_at: localDateTime.toISOString().slice(0, 16),
      };
    }

    // Default to now, formatted for datetime-local input
    const now = new Date();
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return {
      amount: 0,
      retailer: "" as any,
      productName: "" as any,
      province: null,
      bought_at: localDateTime.toISOString().slice(0, 16),
    };
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when entry changes
  useEffect(() => {
    reset(getDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const onSubmit = async (data: PortfolioFormData) => {
    try {
      // Convert datetime-local format to ISO string
      const boughtAtDate = new Date(data.bought_at);
      const boughtAtISO = boughtAtDate.toISOString();

      if (isEditing && entry) {
        // Update existing entry
        await updateMutation.mutateAsync({
          id: entry.id,
          amount: data.amount,
          retailer: data.retailer,
          productName: data.productName,
          province: data.province || null,
          bought_at: boughtAtISO,
        });
      } else {
        // Create new entry
        await createMutation.mutateAsync({
          amount: data.amount,
          retailer: data.retailer,
          productName: data.productName,
          province: data.province || null,
          bought_at: boughtAtISO,
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error(
        `Failed to ${isEditing ? "update" : "create"} portfolio entry:`,
        error
      );
    }
  };

  const isLoading =
    isSubmitting ||
    (isEditing ? updateMutation.isPending : createMutation.isPending);
  const error = isEditing ? updateMutation.error : createMutation.error;

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Số Lượng (chỉ) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.001"
            min="0"
            placeholder="Ví dụ: 1.5"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="retailer">Nhà Bán *</Label>
          <Controller
            name="retailer"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger id="retailer">
                  <SelectValue placeholder="Chọn nhà bán" />
                </SelectTrigger>
                <SelectContent>
                  {RETAILERS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.retailer && (
            <p className="text-sm text-destructive">
              {errors.retailer.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Sản Phẩm *</Label>
          <Controller
            name="productName"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger id="productName">
                  <SelectValue placeholder="Chọn sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((prod) => (
                    <SelectItem key={prod} value={prod}>
                      {prod}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.productName && (
            <p className="text-sm text-destructive">
              {errors.productName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Tỉnh/Thành Phố</Label>
          <Controller
            name="province"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ""}
                onValueChange={(value) =>
                  field.onChange(value === "" ? null : value)
                }
              >
                <SelectTrigger id="province">
                  <SelectValue placeholder="Chọn tỉnh/TP (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không chọn</SelectItem>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.province && (
            <p className="text-sm text-destructive">
              {errors.province.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="boughtAt">Thời Gian Mua *</Label>
          <Input
            id="boughtAt"
            type="datetime-local"
            {...register("bought_at")}
          />
          {errors.bought_at && (
            <p className="text-sm text-destructive">
              {errors.bought_at.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </Button>
        )}
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {isEditing ? "Cập nhật Giao Dịch" : "Thêm Giao Dịch"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : `Có lỗi xảy ra khi ${isEditing ? "cập nhật" : "thêm"} giao dịch`}
        </p>
      )}
    </form>
  );

  if (inModal) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Chỉnh Sửa Giao Dịch" : "Thêm Giao Dịch Mới"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Cập nhật thông tin giao dịch mua vàng"
            : "Nhập thông tin giao dịch mua vàng của bạn"}
        </CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
