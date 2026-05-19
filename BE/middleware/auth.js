/**
 * middleware/auth.js — Xác thực và phân quyền người dùng.
 *
 * Cung cấp 3 function chính:
 *   1. createToken(user) — Tạo JWT token cho user (dùng khi login/register).
 *   2. verifyToken(req, res, next) — Middleware xác thực: chấp nhận JWT hoặc API key.
 *   3. requireRole(...roles) — Middleware kiểm tra role (vd: 'admin', 'shipper').
 *
 * Hai cách xác thực:
 *   a) JWT Bearer token (header: Authorization: Bearer <token>)
 *      → Dùng cho FE (browser), token có hiệu lực 7 ngày.
 *   b) API Key (header: x-api-key)
 *      → Dùng cho server-to-server (Power Automate, cron bên ngoài).
 *      → Chỉ cho phép một số endpoint admin (allowlist).
 */

import jwt from 'jsonwebtoken'

/**
 * Lấy JWT secret từ .env.
 * - Production: bắt buộc phải set JWT_SECRET (throw error nếu thiếu).
 * - Dev: fallback 'dev-jwt-secret' để không lỗi khi chạy local.
 */
const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || '').trim()
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase()
  if (secret) return secret
  if (nodeEnv === 'production') {
    throw new Error('Missing JWT_SECRET in production environment')
  }
  // Dev-only fallback to avoid breaking local runs; MUST set JWT_SECRET in production.
  return 'dev-jwt-secret'
}

const JWT_SECRET = getJwtSecret()

/**
 * Tạo JWT token cho user.
 * Token chứa: userId, role. Hết hạn sau 7 ngày.
 * @param {Object} user - Document user từ MongoDB (cần _id và role).
 * @returns {string} - JWT token.
 */
export function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Middleware xác thực: chấp nhận JWT (Bearer) hoặc API key (x-api-key).
 *
 * Nếu dùng API key:
 *   - Chỉ cho phép một số route admin (allowlist bên dưới).
 *   - req.userId = 'system', req.userRole = 'admin'.
 *
 * Nếu dùng JWT:
 *   - Decode token → gắn req.userId và req.userRole từ payload.
 */
export function verifyToken(req, res, next) {
  const apiKey = process.env.API_KEY || ''
  const keyHeader = req.headers['x-api-key']

  /**
   * Kiểm tra route hiện tại có nằm trong allowlist API key không.
   * Chỉ cho phép một số endpoint admin-only để tránh lạm dụng.
   */
  const allowApiKeyForThisRoute = (req) => {
    const method = String(req.method || '').toUpperCase()
    const url = String(req.originalUrl || req.url || '')

    // Admin-only routes có thể gọi bằng API key (server-to-server)
    if (url.startsWith('/api/products') && ['POST', 'PUT', 'DELETE'].includes(method)) return true
    if (url.startsWith('/api/coupons')) return true
    if (url.startsWith('/api/site-config') && method === 'PUT') return true
    // Orders admin actions
    if (url === '/api/orders' && method === 'GET') return true
    if (/^\/api\/orders\/[^/]+\/(confirm|cancel)$/.test(url) && method === 'PATCH') return true

    return false
  }

  // Ưu tiên kiểm tra API key trước
  if (apiKey && keyHeader && keyHeader === apiKey.trim()) {
    if (!allowApiKeyForThisRoute(req)) {
      return res.status(401).json({ error: 'API key không được phép cho endpoint này' })
    }
    req.userId = 'system'
    req.userRole = 'admin'
    return next()
  }

  // Kiểm tra JWT Bearer token
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn' })
  }
}

/**
 * Middleware kiểm tra role. Chỉ cho phép nếu userRole nằm trong danh sách.
 * @param  {...string} roles - Các role được phép (vd: 'admin', 'shipper').
 * @returns {Function} Express middleware.
 *
 * Ví dụ: requireRole('admin') → chỉ admin mới vào được.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    next()
  }
}
