import { z } from "zod";
import { RETAILERS, PROVINCES } from "../constants";

export const profitLossFormSchema = z
  .object({
    buy_date: z.string().min(1, "Thời gian mua là bắt buộc"),
    sell_date: z.string().min(1, "Thời gian bán là bắt buộc"),
    gold_amount: z
      .number()
      .positive("Số lượng vàng phải lớn hơn 0")
      .min(0.001, "Số lượng vàng phải ít nhất 0.001 chỉ"),
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
    buy_price: z.number().positive("Giá mua phải lớn hơn 0").optional(),
    sell_price: z.number().positive("Giá bán phải lớn hơn 0").optional(),
  })
  .refine(
    (data) => {
      // Validate that sell date is >= buy date
      const buyDate = new Date(data.buy_date);
      const sellDate = new Date(data.sell_date);
      return sellDate >= buyDate;
    },
    {
      message: "Thời gian bán phải sau hoặc bằng thời gian mua",
      path: ["sell_date"],
    }
  );

export type ProfitLossFormData = z.infer<typeof profitLossFormSchema>;
