import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiShoppingCart, FiStar, FiMinus, FiPlus, FiCheck } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
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
  const [relatedProducts, setRelatedProducts] = useState([])
  const [selectedSku, setSelectedSku] = useState('')
  const [stringEnabled, setStringEnabled] = useState(false)
  const [selectedStringId, setSelectedStringId] = useState('')
  const [tensionKg, setTensionKg] = useState('')
  const [reviews, setReviews] = useState([])
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState(null)
  const [reviewSaving, setReviewSaving] = useState(false)

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

        const stock = typeof data.stock === 'number' ? data.stock : 0
        const variants = Array.isArray(data.variants) && data.variants.length ? data.variants : [{
          sku: `P${data.id}-DEFAULT`,
          attrs: { weight: '', grip: '' },
          stock
        }]

        const firstSku = String(variants[0]?.sku || '').trim()
        setSelectedSku(firstSku)

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
          variants,
          description
        })

        try {
          const related = await api.getRelatedProducts(id, 4)
          setRelatedProducts(related || [])
        } catch {
          setRelatedProducts([])
        }

        try {
          const rv = await api.getProductReviews(id)
          setReviews(Array.isArray(rv) ? rv : [])
        } catch {
          setReviews([])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  const handleAddToCart = () => {
    const variants = Array.isArray(product?.variants) ? product.variants : []
    const picked = variants.find((v) => String(v.sku || '').trim() === String(selectedSku || '').trim()) || variants[0] || null
    const variantStock = picked ? (Number(picked.stock) || 0) : (product?.stock || 0)
    if (variantStock <= 0) return
    const variantPrice = picked && picked.priceOverride != null ? (Number(picked.priceOverride) || 0) : (Number(product?.price) || 0)

    let addOn = null
    if (product?.stringingAddOn?.enabled && stringEnabled) {
      const list = Array.isArray(product.stringingAddOn.strings) ? product.stringingAddOn.strings : []
      const s = list.find((x) => String(x.id) === String(selectedStringId))
      if (!s) return
      const t = Number(tensionKg) || 0
      addOn = { stringId: String(s.id), tensionKg: t }
    }

    addToCart({ ...product, sku: selectedSku, price: variantPrice, stock: variantStock, addOn }, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewSaving(true)
    setReviewError(null)
    try {
      await api.createReview({
        productId: Number(product.id),
        rating: Number(reviewRating) || 5,
        comment: reviewComment
      })
      const rv = await api.getProductReviews(product.id)
      setReviews(Array.isArray(rv) ? rv : [])
      setReviewComment('')
    } catch (err) {
      setReviewError(err.message || 'Không thể gửi đánh giá')
    } finally {
      setReviewSaving(false)
    }
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

  const variants = Array.isArray(product.variants) ? product.variants : []
  const pickedVariant = variants.find((v) => String(v.sku || '').trim() === String(selectedSku || '').trim()) || variants[0] || null
  const variantStock = pickedVariant ? (Number(pickedVariant.stock) || 0) : (product.stock || 0)
  const variantPrice = pickedVariant && pickedVariant.priceOverride != null
    ? (Number(pickedVariant.priceOverride) || 0)
    : (Number(product.price) || 0)
  const mustPickString = product?.stringingAddOn?.enabled && stringEnabled
  const canAddToCart = variantStock > 0 && (!mustPickString || (selectedStringId && Number(tensionKg) > 0))

  return (
    <div className="product-detail-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/products">Sản phẩm</Link>
          <span className="breadcrumb-sep">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

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
              <span className="current-price">{formatPrice(variantPrice)}</span>
              {product.originalPrice && (
                <span className="discount">
                  -{Math.round((1 - variantPrice / product.originalPrice) * 100)}%
                </span>
              )}
            </div>

            <div className="product-actions">
              {Array.isArray(product.variants) && product.variants.length > 1 && (
                <div className="quantity-selector" style={{ marginBottom: '0.75rem' }}>
                  <label>Phiên bản:</label>
                  <select value={selectedSku} onChange={(e) => { setSelectedSku(e.target.value); setQuantity(1) }}>
                    {product.variants.map((v) => {
                      const sku = String(v.sku || '').trim()
                      const label = [v?.attrs?.weight, v?.attrs?.grip].filter(Boolean).join(' - ') || sku
                      return (
                        <option key={sku} value={sku}>
                          {label} ({Math.max(0, Number(v.stock) || 0)} sp)
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {product?.stringingAddOn?.enabled && (
                <div className="quantity-selector" style={{ marginBottom: '0.75rem' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={stringEnabled}
                      onChange={(e) => setStringEnabled(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Đan cước (tùy chọn)
                  </label>
                  {stringEnabled && (
                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <select value={selectedStringId} onChange={(e) => setSelectedStringId(e.target.value)}>
                        <option value="">Chọn loại cước</option>
                        {(product.stringingAddOn.strings || []).map((s) => (
                          <option key={s.id} value={s.id}>{s.name} (+{formatPrice(s.price || 0)})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={tensionKg}
                        onChange={(e) => setTensionKg(e.target.value)}
                        placeholder="Số kg căng (VD: 11)"
                        min={product.stringingAddOn.tension?.minKg || 0}
                        max={product.stringingAddOn.tension?.maxKg || 0}
                        step={product.stringingAddOn.tension?.stepKg || 0.5}
                      />
                    </div>
                  )}
                </div>
              )}

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
                    onChange={(e) => {
                      const raw = Math.max(1, parseInt(e.target.value, 10) || 1)
                      const maxQty = Math.max(1, variantStock || 1)
                      setQuantity(Math.min(maxQty, raw))
                    }}
                    min="1"
                    max={Math.max(1, variantStock || 1)}
                  />
                  <button
                    onClick={() => {
                      setQuantity(Math.min(Math.max(1, variantStock || 1), quantity + 1))
                    }}
                    disabled={quantity >= (variantStock || 0)}
                  >
                    <FiPlus />
                  </button>
                </div>
                <span className={`stock-info ${variantStock === 0 ? 'out-of-stock' : ''}`}>
                  {variantStock > 0 ? `Còn ${variantStock} sản phẩm` : 'Hết hàng'}
                </span>
              </div>

              <div className="action-buttons">
                <button
                  className={`btn btn-primary ${addedToCart ? 'added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
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

        {relatedProducts.length > 0 && (
          <section className="related-products">
            <h2>Sản phẩm liên quan</h2>
            <div className="related-products-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <section className="related-products">
          <h2>Đánh giá</h2>
          {reviews.length === 0 ? (
            <p style={{ opacity: 0.8 }}>Chưa có đánh giá.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong>{'★'.repeat(Math.floor(r.rating || 0))}{'☆'.repeat(5 - Math.floor(r.rating || 0))}</strong>
                    {r.verified && <span style={{ fontSize: 12, opacity: 0.8 }}>Đã mua hàng</span>}
                  </div>
                  {r.comment && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {api.getToken() && (
            <form onSubmit={submitReview} style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Viết đánh giá</h3>
              {reviewError && <p className="auth-error">{reviewError}</p>}
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                  {[5, 4, 3, 2, 1].map((x) => (
                    <option key={x} value={x}>{x} sao</option>
                  ))}
                </select>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Chia sẻ cảm nhận của bạn..."
                />
                <button className="btn btn-primary" type="submit" disabled={reviewSaving}>
                  {reviewSaving ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProductDetail
