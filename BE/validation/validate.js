/**
 * validation/validate.js — Middleware validate body bằng Zod schema.
 *
 * Cách dùng trong route:
 *   import { validateBody } from '../validation/validate.js'
 *   import { productUpsertSchema } from '../validation/schemas.js'
 *   router.post('/', validateBody(productUpsertSchema), async (req, res) => { ... })
 *
 * Nếu body hợp lệ:
 *   - req.body sẽ được "parse" (chuẩn hóa, ép kiểu) bởi Zod → chuyển tiếp next().
 * Nếu body không hợp lệ:
 *   - Trả 400 kèm error message từ Zod (lỗi đầu tiên).
 */

export const validateBody = (schema) => (req, res, next) => {
  try {
    // schema.parse() sẽ throw ZodError nếu body không khớp schema
    req.body = schema.parse(req.body)
    next()
  } catch (err) {
    // Lấy lỗi đầu tiên trong danh sách lỗi Zod
    const first = err?.errors?.[0]
    const msg = first?.message || err?.message || 'Payload không hợp lệ'
    res.status(400).json({ error: msg })
  }
}
