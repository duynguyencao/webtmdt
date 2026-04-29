import jwt from 'jsonwebtoken'

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

export function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/** Cho phép JWT (Bearer) hoặc x-api-key (admin) — phù hợp Power Automate */
export function verifyToken(req, res, next) {
  const apiKey = process.env.API_KEY || ''
  const keyHeader = req.headers['x-api-key']
  const allowApiKeyForThisRoute = (req) => {
    const method = String(req.method || '').toUpperCase()
    const url = String(req.originalUrl || req.url || '')

    // Admin-only routes that may be called server-to-server (Power Automate, etc.)
    if (url.startsWith('/api/products') && ['POST', 'PUT', 'DELETE'].includes(method)) return true
    if (url.startsWith('/api/coupons')) return true
    if (url.startsWith('/api/site-config') && method === 'PUT') return true

    // Orders admin actions (explicit allowlist; buyer endpoints already block x-api-key)
    if (url === '/api/orders' && method === 'GET') return true
    if (/^\/api\/orders\/[^/]+\/(confirm|cancel)$/.test(url) && method === 'PATCH') return true

    return false
  }

  if (apiKey && keyHeader && keyHeader === apiKey.trim()) {
    if (!allowApiKeyForThisRoute(req)) {
      return res.status(401).json({ error: 'API key không được phép cho endpoint này' })
    }
    req.userId = 'system'
    req.userRole = 'admin'
    return next()
  }
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

/** Chỉ cho phép các role trong danh sách (vd: admin) */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    next()
  }
}
