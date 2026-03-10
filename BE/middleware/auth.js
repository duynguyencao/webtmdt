import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
  if (apiKey && keyHeader && keyHeader === apiKey.trim()) {
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
