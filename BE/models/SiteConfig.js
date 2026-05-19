/**
 * models/SiteConfig.js — Cấu hình giao diện trang chủ (admin quản lý).
 *
 * Mỗi cấu hình là 1 document với key='home' (hiện chỉ có 1 config duy nhất).
 * Admin có thể thay đổi tiêu đề, subtitle, ảnh hero, và số cột grid sản phẩm.
 */

import mongoose from 'mongoose'

const siteConfigSchema = new mongoose.Schema({
  // Key nhận dạng config (mặc định 'home', chỉ cần 1 document)
  key: { type: String, required: true, unique: true, default: 'home' },
  // Tiêu đề hero banner trang chủ
  heroTitle: { type: String, default: 'Cửa Hàng Cầu Lông Chuyên Nghiệp' },
  // Phụ đề hero banner
  heroSubtitle: { type: String, default: 'Hơn 50 chi nhánh trên toàn quốc. Sản phẩm chính hãng, giá tốt nhất thị trường.' },
  // URL ảnh hero banner
  heroImage: { type: String, default: '' },
  // Tiêu đề phần sale
  saleTitle: { type: String, default: 'Sale Off Lên Đến 50%' },
  // Số cột hiển thị grid sản phẩm (2-8 cột)
  productGridCols: { type: Number, default: 4, min: 2, max: 8 }
}, { timestamps: true })

export default mongoose.model('SiteConfig', siteConfigSchema)
