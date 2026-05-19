/**
 * Supabase Storage Service — Upload ảnh sản phẩm.
 *
 * Cần biến môi trường:
 *   SUPABASE_URL        — URL project Supabase (vd. https://xxxx.supabase.co)
 *   SUPABASE_SERVICE_KEY — Service Role Key (cho phép upload, KHÔNG phải anon key)
 *   SUPABASE_BUCKET      — Tên bucket (mặc định "product-images")
 *
 * Bucket trên Supabase cần:
 *   1. Tạo bucket "product-images" (hoặc tên khác, đổi trong .env)
 *   2. Đặt bucket là **public** để ảnh có thể truy cập không cần auth
 */

import { createClient } from '@supabase/supabase-js'

// Lazy init: chỉ tạo client khi thực sự cần upload (tránh crash server khi chưa cấu hình)
let _supabase = null
function getClient() {
  if (_supabase) return _supabase

  // Đọc env ở đây (không phải top-level) vì dotenv.config() chạy SAU khi ES Module import
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim()

  if (!url || !key) {
    throw new Error('Chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_KEY trong BE/.env')
  }
  _supabase = createClient(url, key)
  return _supabase
}

function getBucket() {
  return (process.env.SUPABASE_BUCKET || 'product-images').trim()
}

/**
 * Upload buffer ảnh lên Supabase Storage.
 * @param {Buffer} fileBuffer — dữ liệu ảnh
 * @param {string} originalName — tên file gốc (vd. "vot-yonex.jpg")
 * @param {string} mimeType — content type (vd. "image/jpeg")
 * @returns {Promise<string>} — public URL của ảnh trên Supabase
 */
export async function uploadImage(fileBuffer, originalName, mimeType) {
  const supabase = getClient()
  const bucket = getBucket()

  // Tạo tên file duy nhất: timestamp + random + extension
  const ext = originalName.split('.').pop() || 'jpg'
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`
  const filePath = `products/${safeName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    })

  if (error) {
    throw new Error(`Upload Supabase thất bại: ${error.message}`)
  }

  // Lấy public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}
