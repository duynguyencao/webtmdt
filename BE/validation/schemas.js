/**
 * validation/schemas.js — Định nghĩa Zod schemas cho request validation.
 *
 * Mỗi schema dùng kết hợp với middleware validateBody() trong validate.js.
 * Khi request đến → body được parse bởi schema:
 *   - Hợp lệ: chuẩn hóa dữ liệu (trim, ép kiểu) rồi chuyển tiếp.
 *   - Không hợp lệ: trả 400 kèm lỗi cụ thể.
 */

import { z } from 'zod'

/** Schema đăng ký: tên (≥2 ký tự), email hợp lệ, mật khẩu (≥6 ký tự) */
export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6)
})

/** Schema đăng nhập: email + password (≥1 ký tự, kiểm tra đúng sai ở logic) */
export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
})

/**
 * Schema tạo đơn hàng:
 * - customer: thông tin người nhận (bắt buộc name, phone)
 * - items: danh sách sản phẩm (ít nhất 1, mỗi item cần id + quantity)
 * - paymentMethod: 'cod' hoặc 'payos' (mặc định cod nếu không truyền)
 * - note, couponCode: tùy chọn
 */
export const orderCreateSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2),
    phone: z.string().trim().min(6),
    email: z.string().trim().email().optional().or(z.literal('')).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    cityName: z.string().optional(),
    district: z.string().optional(),
    districtName: z.string().optional(),
    ward: z.string().optional(),
    wardName: z.string().optional()
  }),
  items: z.array(z.object({
    id: z.number().int().positive(),        // Product.id
    quantity: z.number().int().positive(),   // Số lượng mua
  })).min(1),
  paymentMethod: z.enum(['cod', 'payos']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional()
})

/**
 * Schema thêm/sửa 1 item giỏ hàng:
 * - Chấp nhận cả productId hoặc id (tương thích 2 naming convention).
 * - quantity: số lượng (≥1).
 */
export const cartItemUpsertSchema = z.object({
  productId: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  quantity: z.number().int().positive()
}).refine((v) => v.productId != null || v.id != null, { message: 'Thiếu productId' })

/** Schema thay thế toàn bộ giỏ hàng (PUT /api/cart) */
export const cartReplaceSchema = z.object({
  items: z.array(cartItemUpsertSchema).default([])
})

/**
 * Schema thêm/sửa sản phẩm:
 * - Bắt buộc: name, brand, price.
 * - image: URL ảnh (từ Supabase hoặc link ngoài), optional khi sửa.
 * - stock: tồn kho (≥0), optional (giữ nguyên nếu không truyền).
 */
export const productUpsertSchema = z.object({
  name: z.string().trim().min(2),
  brand: z.string().trim().min(1),
  category: z.string().trim().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  image: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  discountPercent: z.number().optional(),
  sale: z.boolean().optional(),
  stock: z.number().int().min(0).optional()
})

/** Schema query gợi ý sản phẩm (autocomplete search) */
export const productSuggestionsQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional()
})
