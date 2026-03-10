import 'dotenv/config'
import { connectDB } from '../db/dbConnect.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import User from '../models/User.js'
import { productsSeed } from './productsSeed.js'
import { usersSeed } from './usersSeed.js'

const categoriesSeed = [
  { name: 'Vợt Cầu Lông', path: '/products?category=vot', image: 'https://cdn.shopvnb.com/uploads/gallery/set-vot-cau-long-yonex-nanoflare-1000z-nguyen-thuy-linh-chinh-hang_1760491235.webp', count: 0 },
  { name: 'Giày Cầu Lông', path: '/products?category=giay', image: 'https://instagram.fhan14-2.fna.fbcdn.net/v/t51.82787-15/584404493_18534269263006130_2890577367026495614_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=100&ig_cache_key=Mzc3MDA1NTMxNzU5ODU5NzgxOQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTgwMC5zZHIuQzMifQ%3D%3D&_nc_ohc=M7313Nlgh2cQ7kNvwFMEFP_&_nc_oc=AdnMOm3FwxBf4rX3aQ3jhLum41Bv2cJgy8sVDQOcXI6rKFjiq4UrQskwm2q0_sjLfLk&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fhan14-2.fna&_nc_gid=VVvQ9KeceYCr-GglwZ9nzA&_nc_ss=8&oh=00_AfypfP-pkB2EwWQgzEzUi6HbsHXWlFD_onWthyQkewaFSQ&oe=69B5FB1D', count: 0 },
  { name: 'Áo Cầu Lông', path: '/products?category=ao', image: 'https://instagram.fhan14-1.fna.fbcdn.net/v/t51.82787-15/638281918_18189043774359809_3655913067313821178_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=MzgzNjU0Mjg0NzQyODk4NjkyNA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwODB4MTM1MC5zZHIuQzMifQ%3D%3D&_nc_ohc=eSyHXwDiV2oQ7kNvwFxzne5&_nc_oc=AdlfFD_pSb6UBINH8YAx6eVUEGCUoFF7xpUwjRBNxVwUYFDI880gNDpshFjMSfwirBw&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fhan14-1.fna&_nc_gid=7psKRHcLORdsVLWHTDqZfQ&_nc_ss=8&oh=00_AfzSk4-ZTnBf0VFqAJEsq5SSZFchINewmOIwR2Tw44xkqQ&oe=69B5F91A', count: 0 },
  { name: 'Quần Cầu Lông', path: '/products?category=quan', image: 'https://instagram.fhan14-1.fna.fbcdn.net/v/t51.82787-15/630109781_18188868244359809_8452049767788390592_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=MzgzNTI1MTMwMTgyMzk5MDU5Mg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwODB4MTM1MC5zZHIuQzMifQ%3D%3D&_nc_ohc=pz9QAMIkwRUQ7kNvwEsa7xb&_nc_oc=AdkxBu7UdhwiQ9ImAaZVTxwL9_pXiGvk4RcbQacdncxa7sfi_J4-x34pacQU0AEDr5M&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fhan14-1.fna&_nc_gid=7psKRHcLORdsVLWHTDqZfQ&_nc_ss=8&oh=00_AfzqxzrWztqG208ZHxHnEDcj2ugnSWEVgs_6L8fQuywD5w&oe=69B5E657', count: 0 },
  { name: 'Túi Vợt', path: '/products?category=tui', image: 'https://instagram.fhan14-5.fna.fbcdn.net/v/t51.82787-15/638285420_18189429271359809_9767381581616926_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=104&ig_cache_key=MzgzOTQ4MDY0MTE4OTI0NTk1MA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkyMC5zZHIuQzMifQ%3D%3D&_nc_ohc=iOWlf40JKUkQ7kNvwHcdZ0S&_nc_oc=AdmYY2sb01Asx8NHbTg4dDbtLoxw30YM60fBBbIFuzt8Mr7NtVgwvEV92GiV6vRTvoA&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fhan14-5.fna&_nc_gid=zkiXRjgiC38Mqz0lPFxNnA&_nc_ss=8&oh=00_AfxAfFWOhfUBpBMA5Fp4UTisua15R6YP2wfz062wZlPnNw&oe=69B6020A', count: 0 },
  { name: 'Phụ Kiện', path: '/products?category=phu-kien', image: 'https://cdn.shopvnb.com/uploads/san_pham/ong-cau-long-yonex-as40-1.webp', count: 0 }
]

async function seed() {
  try {
    await connectDB()

    const categoryCounts = {}
    productsSeed.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1
    })

    await Product.deleteMany({})
    await Product.insertMany(productsSeed)
    console.log('Đã seed', productsSeed.length, 'sản phẩm')

    const categoriesWithCount = categoriesSeed.map(c => {
      const key = c.path.split('category=')[1] || ''
      return { ...c, count: categoryCounts[key] || 0 }
    })
    await Category.deleteMany({})
    await Category.insertMany(categoriesWithCount)
    console.log('Đã seed', categoriesWithCount.length, 'danh mục')

    for (const u of usersSeed) {
      const existing = await User.findOne({ email: u.email.toLowerCase() })
      if (!existing) {
        await User.create(u)
        console.log('Đã tạo user:', u.email, '/ mật khẩu:', u.password, '| role:', u.role)
      } else {
        console.log('User đã tồn tại (bỏ qua):', u.email)
      }
    }

    process.exit(0)
  } catch (err) {
    console.error('Lỗi seed:', err)
    process.exit(1)
  }
}

seed()
