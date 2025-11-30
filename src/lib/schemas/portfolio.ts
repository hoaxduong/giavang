import { z } from 'zod'
import { RETAILERS, PRODUCT_TYPES, PROVINCES } from '../constants'

export const portfolioFormSchema = z.object({
  amount: z
    .number({
      required_error: 'Số lượng là bắt buộc',
      invalid_type_error: 'Số lượng phải là số',
    })
    .positive('Số lượng phải lớn hơn 0')
    .min(0.001, 'Số lượng phải lớn hơn 0'),
  retailer: z.enum(RETAILERS as [string, ...string[]], {
    required_error: 'Vui lòng chọn nhà bán',
  }),
  product_type: z.enum(PRODUCT_TYPES.map((t) => t.value) as [string, ...string[]], {
    required_error: 'Vui lòng chọn loại vàng',
  }),
  province: z
    .union([
      z.enum(PROVINCES as [string, ...string[]]),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  bought_at: z
    .string({
      required_error: 'Thời gian mua là bắt buộc',
    })
    .min(1, 'Thời gian mua là bắt buộc'),
})

export type PortfolioFormData = z.infer<typeof portfolioFormSchema>

