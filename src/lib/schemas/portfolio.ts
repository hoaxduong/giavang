import { z } from "zod";
import { RETAILERS, PROVINCES } from "../constants";

export const portfolioFormSchema = z.object({
  amount: z
    .number()
    .positive("Số lượng phải lớn hơn 0")
    .min(0.001, "Số lượng phải lớn hơn 0"),
  retailer: z.enum(RETAILERS as unknown as [string, ...string[]]),
  productName: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  province: z
    .union([
      z.enum(PROVINCES as unknown as [string, ...string[]]),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .nullable(),
  bought_at: z.string().min(1, "Thời gian mua là bắt buộc"),
  buy_price: z
    .number({
      required_error: "Giá mua là bắt buộc",
      invalid_type_error: "Giá mua phải là số",
    })
    .min(0, "Giá mua không được âm"),
});

export type PortfolioFormData = z.infer<typeof portfolioFormSchema>;
