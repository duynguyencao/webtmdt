import mongoose from 'mongoose'

const siteConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'home' },
  heroTitle: { type: String, default: 'Cửa Hàng Cầu Lông Chuyên Nghiệp' },
  heroSubtitle: { type: String, default: 'Hơn 50 chi nhánh trên toàn quốc. Sản phẩm chính hãng, giá tốt nhất thị trường.' },
  heroImage: { type: String, default: '' },
  saleTitle: { type: String, default: 'Sale Off Lên Đến 50%' },
  productGridCols: { type: Number, default: 4, min: 2, max: 6 }
}, { timestamps: true })

export default mongoose.model('SiteConfig', siteConfigSchema)
