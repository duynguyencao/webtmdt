import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiTruck, FiShield, FiCreditCard, FiRefreshCw } from 'react-icons/fi'
import ProductCard from '../components/ProductCard'
import CategoryCard from '../components/CategoryCard'
import { api } from '../api/client'
import './Home.css'

const Home = () => {
  const [categories, setCategories] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [catsRes, productsRes] = await Promise.all([
          api.getCategories(),
          api.getProducts({ featured: 'true' })
        ])
        setCategories(catsRes)
        setFeaturedProducts(productsRes)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const features = [
    {
      icon: <FiTruck />,
      title: 'Vận chuyển toàn quốc',
      description: 'Thanh toán khi nhận hàng'
    },
    {
      icon: <FiShield />,
      title: 'Bảo đảm chất lượng',
      description: 'Sản phẩm chính hãng 100%'
    },
    {
      icon: <FiCreditCard />,
      title: 'Thanh toán linh hoạt',
      description: 'Nhiều phương thức thanh toán'
    },
    {
      icon: <FiRefreshCw />,
      title: 'Đổi trả dễ dàng',
      description: 'Đổi sản phẩm mới nếu lỗi'
    },
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Cửa Hàng Cầu Lông
              <span className="highlight"> Chuyên Nghiệp</span>
            </h1>
            <p className="hero-description">
              Hơn 50 chi nhánh trên toàn quốc. Sản phẩm chính hãng, giá tốt nhất thị trường.
            </p>
            <div className="hero-buttons">
              <Link to="/products" className="btn btn-primary">
                Mua ngay
                <FiArrowRight />
              </Link>
              <Link to="/products?sale=true" className="btn btn-outline">
                Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://cdn.shopvnb.com/uploads/images/tin_tuc/tu-dai-thien-vuong-top-4-huyen-thoai-o-the-gioi-la-ai-1.webp"
              alt="Cầu lông"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Danh Mục Sản Phẩm</h2>
          {loading ? (
            <p className="loading-text">Đang tải...</p>
          ) : error ? (
            <p className="error-text">Không tải được dữ liệu. Kiểm tra backend và MongoDB.</p>
          ) : (
            <div className="categories-grid">
              {categories.map((category, index) => (
                <CategoryCard key={index} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Sản Phẩm Nổi Bật</h2>
            <Link to="/products" className="view-all-link">
              Xem tất cả <FiArrowRight />
            </Link>
          </div>
          {loading ? (
            <p className="loading-text">Đang tải...</p>
          ) : error ? (
            <p className="error-text">Không tải được sản phẩm.</p>
          ) : (
            <div className="products-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sale Section */}
      <section className="section sale-section">
        <div className="container">
          <div className="sale-banner">
            <div className="sale-content">
              <h2 className="sale-title">Sale Off Lên Đến 50%</h2>
              <p className="sale-description">
                Cơ hội mua sắm với giá tốt nhất trong năm. Nhanh tay đặt hàng ngay!
              </p>
              <Link to="/products?sale=true" className="btn btn-white">
                Xem ngay <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
