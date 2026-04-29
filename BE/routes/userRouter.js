import { Router } from 'express'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import { createToken, verifyToken } from '../middleware/auth.js'
import { validateBody } from '../validation/validate.js'
import { loginSchema, registerSchema } from '../validation/schemas.js'

const router = Router()

const JWT_SECRET_FALLBACK = 'your-secret-key-change-in-production'
const JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET_FALLBACK
const EMAIL_VERIFY_SECRET = process.env.EMAIL_VERIFY_SECRET || JWT_SECRET

const createEmailTransporter = () => {
  const host = String(process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com').trim()
  const port = Number(process.env.EMAIL_SMTP_PORT || 587)
  const user = String(process.env.EMAIL_SMTP_USER || '').trim()
  const pass = String(process.env.EMAIL_SMTP_PASS || '').trim()
  const from = String(process.env.EMAIL_FROM || user).trim()

  if (!user || !pass || !from) {
    throw new Error('Chưa cấu hình mail: cần EMAIL_SMTP_USER, EMAIL_SMTP_PASS, EMAIL_FROM (hoặc EMAIL_FROM trùng EMAIL_SMTP_USER).')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  })
}

const sendEmailVerification = async ({ to, name, token, baseUrl }) => {
  const transporter = createEmailTransporter()
  const verifyUrl = `${String(baseUrl).replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`

  const subject = 'Xác thực email đăng ký ShopTD'
  const text = `Chào ${name || ''},\n\nVui lòng nhấn vào link để xác thực email:\n${verifyUrl}\n\nLink có hiệu lực trong 24 giờ.\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.\n`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <p>Chào <strong>${(name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>,</p>
      <p>Vui lòng nhấn vào link để xác thực email:</p>
      <p style="margin:16px 0">
        <a href="${verifyUrl}" target="_blank" rel="noreferrer" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
          Xác thực email
        </a>
      </p>
      <p>Link có hiệu lực trong 24 giờ.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    </div>
  `

  const from = String(process.env.EMAIL_FROM || process.env.EMAIL_SMTP_USER || '').trim()
  await transporter.sendMail({ from, to, subject, text, html })
}

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
})

// POST /api/user/register — công khai
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Thiếu name, email hoặc password' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' })
    }
    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedName = String(name).trim()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      // Nếu email chưa xác thực => gửi lại email xác thực.
      if (!existing.emailVerified) {
        const verifyToken = jwt.sign(
          { userId: existing._id.toString(), purpose: 'emailVerify' },
          EMAIL_VERIFY_SECRET,
          { expiresIn: '24h' }
        )

        const baseUrl = String(req.headers.origin || process.env.FE_BASE_URL || 'http://localhost:3000').trim()
        await sendEmailVerification({ to: existing.email, name: existing.name, token: verifyToken, baseUrl })
        return res.status(201).json({
          message: 'Email đã tồn tại nhưng chưa xác thực. Mình đã gửi lại link xác thực vào email của bạn.'
        })
      }
      return res.status(400).json({ error: 'Email đã được sử dụng' })
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: 'buyer',
      emailVerified: false
    })

    const verifyToken = jwt.sign(
      { userId: user._id.toString(), purpose: 'emailVerify' },
      EMAIL_VERIFY_SECRET,
      { expiresIn: '24h' }
    )

    const baseUrl = String(req.headers.origin || process.env.FE_BASE_URL || 'http://localhost:3000').trim()
    await sendEmailVerification({ to: user.email, name: user.name, token: verifyToken, baseUrl })

    return res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực trước khi đăng nhập.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/user/login — công khai
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc password' })
    }
    const normalizedEmail = String(email).toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu sai' })
    const ok = await user.comparePassword(password)
    if (!ok) return res.status(401).json({ error: 'Email hoặc mật khẩu sai' })
    if (!user.emailVerified) return res.status(403).json({ error: 'Chưa xác thực email. Vui lòng kiểm tra email để xác thực.' })
    const token = createToken(user)
    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: user.toJSON()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/user/verify-email?token=... — xác thực email và trả JWT để FE tự đăng nhập
router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim()
    if (!token) return res.status(400).json({ error: 'Thiếu token xác thực email' })

    const decoded = jwt.verify(token, EMAIL_VERIFY_SECRET)
    if (!decoded || decoded.purpose !== 'emailVerify') {
      return res.status(400).json({ error: 'Token xác thực email không hợp lệ' })
    }

    const user = await User.findById(decoded.userId)
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })

    if (!user.emailVerified) {
      user.emailVerified = true
      await user.save()
    }

    const loginToken = createToken(user)
    return res.json({
      token: loginToken,
      user: user.toJSON(),
      message: user.emailVerified ? 'Xác thực email thành công' : 'Xác thực email thất bại'
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Token không hợp lệ hoặc hết hạn' })
  }
})

// GET /api/user/me — cần auth: trả về user hiện tại (để FE kiểm tra đã đăng nhập chưa)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })
    res.json(user.toJSON())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/user/me — cập nhật thông tin tài khoản (buyer/admin)
router.put('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })

    const name = req.body?.name != null ? String(req.body.name).trim() : null
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null
    const addressLine1 = req.body?.addressLine1 != null ? String(req.body.addressLine1).trim() : null
    const city = req.body?.city != null ? String(req.body.city).trim() : null
    const district = req.body?.district != null ? String(req.body.district).trim() : null
    const ward = req.body?.ward != null ? String(req.body.ward).trim() : null

    if (name !== null) {
      if (name.length < 2) return res.status(400).json({ error: 'Tên không hợp lệ' })
      user.name = name
    }
    if (phone !== null) user.phone = phone
    if (addressLine1 !== null) user.address.line1 = addressLine1
    if (city !== null) user.address.city = city
    if (district !== null) user.address.district = district
    if (ward !== null) user.address.ward = ward

    await user.save()
    return res.json({ message: 'Đã cập nhật thông tin', user: user.toJSON() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
