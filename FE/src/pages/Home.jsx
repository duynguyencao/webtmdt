import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiTruck, FiShield, FiCreditCard, FiRefreshCw } from 'react-icons/fi'
import ProductCard from '../components/ProductCard'
import { api } from '../api/client'
import './Home.css'

const Home = () => {
  const [bestSellers, setBestSellers] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [discountedProducts, setDiscountedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [siteConfig, setSiteConfig] = useState({})
  const desktopGridCols = Math.min(8, Math.max(2, Number(siteConfig.productGridCols) || 4))

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [bestRes, newestRes, discountedRes, configRes] = await Promise.all([
          api.getBestSellers(8),
          api.getNewest(8),
          api.getDiscounted(8),
          api.getSiteConfig()
        ])
        setBestSellers(bestRes || [])
        setNewArrivals(newestRes || [])
        setDiscountedProducts(discountedRes || [])
        setSiteConfig(configRes || {})
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
      <style>{`
        @media (min-width: 641px) {
          .home .products-grid {
            grid-template-columns: repeat(${desktopGridCols}, minmax(0, 1fr));
          }
        }
      `}</style>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              {siteConfig.heroTitle || 'Cửa Hàng Cầu Lông Chuyên Nghiệp'}
            </h1>
            <p className="hero-description">
              {siteConfig.heroSubtitle || 'Hơn 50 chi nhánh trên toàn quốc. Sản phẩm chính hãng, giá tốt nhất thị trường.'}
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
              src={siteConfig.heroImage || 'https://cdn.shopvnb.com/uploads/images/tin_tuc/tu-dai-thien-vuong-top-4-huyen-thoai-o-the-gioi-la-ai-1.webp'}
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

      {/* Best Sellers Section */}
      <section className="section products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Vợt bán chạy</h2>
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
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New arrivals */}
      <section className="section products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Vợt mới về</h2>
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
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Discounted products */}
      <section className="section products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Đang giảm giá</h2>
            <Link to="/products?sale=true" className="view-all-link">
              Xem khuyến mãi <FiArrowRight />
            </Link>
          </div>
          {loading ? (
            <p className="loading-text">Đang tải...</p>
          ) : error ? (
            <p className="error-text">Không tải được sản phẩm.</p>
          ) : (
            <div className="products-grid">
              {discountedProducts.map((product) => (
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
              <h2 className="sale-title">{siteConfig.saleTitle || 'Sale Off Lên Đến 50%'}</h2>
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
