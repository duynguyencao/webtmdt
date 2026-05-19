/**
 * Route upload ảnh sản phẩm lên Supabase Storage.
 *
 * POST /api/upload/image — multipart/form-data, field "image"
 * Response: { url: "https://xxxx.supabase.co/storage/v1/object/public/..." }
 *
 * Giới hạn: 5 MB, chỉ chấp nhận image/jpeg, image/png, image/webp, image/gif
 */

import { Router } from 'express'
import multer from 'multer'
import { verifyToken, requireRole } from '../middleware/auth.js'
import { uploadImage } from '../services/supabaseStorage.js'

const router = Router()

// Cấu hình multer: lưu vào RAM (buffer), giới hạn 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)'))
    }
  }
})

// POST /api/upload/image — Admin upload ảnh sản phẩm
router.post(
  '/image',
  verifyToken,
  requireRole('admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Không tìm thấy file ảnh (field: "image")' })
      }

      const url = await uploadImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      )

      res.json({ url })
    } catch (err) {
      console.error('[upload/image]', err.message)
      res.status(500).json({ error: err.message || 'Upload ảnh thất bại' })
    }
  }
)

export default router
