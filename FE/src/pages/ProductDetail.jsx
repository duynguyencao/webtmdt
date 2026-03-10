import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FiShoppingCart, FiHeart, FiStar, FiMinus, FiPlus, FiCheck } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import './ProductDetail.css'

const ProductDetail = () => {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeTab, setActiveTab] = useState('description') // 'description' | 'specs'

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const data = await api.getProductDetail(id)

        const images = (Array.isArray(data.images) && data.images.length > 0)
          ? data.images
          : [data.image, data.image, data.image].filter(Boolean)

        const specifications = (data.specifications && Object.keys(data.specifications).length > 0)
          ? data.specifications
          : (data.specs || {})

        const stock = typeof data.stock === 'number' && data.stock > 0 ? data.stock : 20

        const descriptionLines = String(data.description || '')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => {
            if (!line) return false
            const lower = line.toLowerCase()
            // Ẩn các dòng menu/footer, hotline, chính sách, v.v.
            if (lower.includes('hotline') || lower.includes('mr.') || lower.includes('chính sách')) return false
            if (/\d{3}\.\d{3}\.\d{3}/.test(line)) return false // số điện thoại 0334.741.141
            return true
          })

        const description = descriptionLines.slice(0, 40).join('\n')

        setProduct({
          ...data,
          images,
          specifications,
          stock,
          description
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  if (loading) return <div className="loading">Đang tải...</div>
  if (error) return <div className="loading">Không tìm thấy sản phẩm hoặc lỗi kết nối.</div>
  if (!product) return null

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="product-detail">
          <div className="product-images">
            <div className="main-image">
              <img src={product.images[selectedImage]} alt={product.name} />
            </div>
            <div className="thumbnail-nav">
              <button
                type="button"
                className="thumb-arrow thumb-arrow-left"
                onClick={() => setSelectedImage((prev) => Math.max(0, prev - 1))}
                disabled={selectedImage === 0}
              >
                ‹
              </button>
              <div className="thumbnail-images">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="thumb-arrow thumb-arrow-right"
                onClick={() => setSelectedImage((prev) => Math.min(product.images.length - 1, prev + 1))}
                disabled={selectedImage === product.images.length - 1}
              >
                ›
              </button>
            </div>
          </div>

          <div className="product-info">
            <div className="product-header">
              <span className="product-brand">{product.brand}</span>
              <h1 className="product-title">{product.name}</h1>
              <div className="product-rating">
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FiStar
                      key={i}
                      className={i < Math.floor(product.rating) ? 'filled' : ''}
                    />
                  ))}
                </div>
                <span className="rating-text">
                  {product.rating} ({product.reviews} đánh giá)
                </span>
              </div>
            </div>

            <div className="product-pricing">
              {product.originalPrice && (
                <span className="original-price">{formatPrice(product.originalPrice)}</span>
              )}
              <span className="current-price">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="discount">
                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                </span>
              )}
            </div>

            <div className="product-actions">
              <div className="quantity-selector">
                <label>Số lượng:</label>
                <div className="quantity-controls">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <FiMinus />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={product.stock}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <FiPlus />
                  </button>
                </div>
                <span className="stock-info">
                  Còn {product.stock} sản phẩm
                </span>
              </div>

              <div className="action-buttons">
                <button
                  className={`btn btn-primary ${addedToCart ? 'added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                >
                  {addedToCart ? (
                    <>
                      <FiCheck /> Đã thêm vào giỏ
                    </>
                  ) : (
                    <>
                      <FiShoppingCart /> Thêm vào giỏ hàng
                    </>
                  )}
                </button>
                <button className="btn btn-outline">
                  <FiHeart />
                  Yêu thích
                </button>
              </div>
            </div>

            <div className="product-features">
              <div className="feature">
                <span>🚚</span>
                <div>
                  <strong>Miễn phí vận chuyển</strong>
                  <p>Cho đơn hàng trên 500.000đ</p>
                </div>
              </div>
              <div className="feature">
                <span>🔄</span>
                <div>
                  <strong>Đổi trả miễn phí</strong>
                  <p>Trong vòng 7 ngày</p>
                </div>
              </div>
              <div className="feature">
                <span>🛡️</span>
                <div>
                  <strong>Bảo hành chính hãng</strong>
                  <p>12 tháng từ nhà sản xuất</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <div className="product-tabs-header">
            <button
              type="button"
              className={`product-tab-button ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Mô tả sản phẩm
            </button>
            <button
              type="button"
              className={`product-tab-button ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              Thông số kỹ thuật
            </button>
          </div>

          <div className="product-tab-content">
            {activeTab === 'description' && (
              <div className="product-description">
                {String(product.description || '')
                  .split('\n')
                  .filter((line) => line.trim().length > 0)
                  .map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="product-specifications">
                <table>
                  <tbody>
                    {Object.entries(product.specifications || {}).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
