import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { FiShoppingCart, FiStar, FiMinus, FiPlus, FiCheck } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
import './ProductDetail.css'

const clampRating = (v) => Math.max(1, Math.min(5, Math.round(Number(v) || 1)))

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const initialsFromName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A'
  const last = parts[parts.length - 1]
  const first = parts[0]
  const a = (first[0] || '').toUpperCase()
  const b = (last[0] || '').toUpperCase()
  return (a + b).trim() || 'A'
}

const ProductDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const { addToCart } = useCart()
  const reviewsRef = useRef(null)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeTab, setActiveTab] = useState('description') // 'description' | 'specs'
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [imageZoomOpen, setImageZoomOpen] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewSort, setReviewSort] = useState('newest') // newest | highest | lowest
  const [me, setMe] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewHover, setReviewHover] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState(null)

  useEffect(() => {
    setDescriptionExpanded(false)
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

  useEffect(() => {
    if (!product) return
    if (String(location.hash || '').toLowerCase() !== '#reviews') return
    const t = setTimeout(() => {
      try {
        reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {
        // ignore
      }
    }, 100)
    return () => clearTimeout(t)
  }, [product, location.hash])

  useEffect(() => {
    if (!imageZoomOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setImageZoomOpen(false)
      if (e.key === 'ArrowLeft') setSelectedImage((prev) => Math.max(0, prev - 1))
      if (e.key === 'ArrowRight') setSelectedImage((prev) => Math.min(product.images.length - 1, prev + 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [imageZoomOpen, product?.images?.length])

  useEffect(() => {
    if (!api.getToken()) {
      setMe(null)
      return
    }
    api.getMe().then(setMe).catch(() => setMe(null))
  }, [id])

  const orderIdFromQuery = useMemo(() => {
    const sp = new URLSearchParams(location.search || '')
    const v = String(sp.get('orderId') || '').trim()
    return v || null
  }, [location.search])

  const handleAddToCart = () => {
    const stock = Number(product?.stock) || 0
    if (stock <= 0) return
    const price = Number(product?.price) || 0
    const added = addToCart({ ...product, price, stock }, quantity)
    if (!added) return
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewSaving(true)
    setReviewError(null)
    try {
      if (editingReviewId) {
        await api.updateReview(editingReviewId, {
          rating: clampRating(reviewRating),
          comment: String(reviewComment || '').trim()
        })
      } else {
        await api.createReview({
          productId: Number(product.id),
          orderId: orderIdFromQuery || undefined,
          rating: clampRating(reviewRating),
          comment: String(reviewComment || '').trim()
        })
      }
      const rv = await api.getProductReviews(product.id)
      setReviews(Array.isArray(rv) ? rv : [])
      setReviewComment('')
      setReviewHover(null)
      setEditingReviewId(null)
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

  const reviewsSorted = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : []
    const sorted = [...list].sort((a, b) => {
      if (reviewSort === 'highest') return (Number(b.rating) || 0) - (Number(a.rating) || 0)
      if (reviewSort === 'lowest') return (Number(a.rating) || 0) - (Number(b.rating) || 0)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })
    return sorted
  }, [reviews, reviewSort])

  const myReviewForThisOrder = useMemo(() => {
    if (!me?.id) return null
    if (!orderIdFromQuery) return null
    const list = Array.isArray(reviews) ? reviews : []
    return list.find((r) => String(r.userId || '') === String(me.id) && String(r.orderId || '') === String(orderIdFromQuery)) || null
  }, [reviews, me?.id, orderIdFromQuery])

  useEffect(() => {
    // Nếu đi từ đơn hàng sang (có orderId) và đã từng review => tự chuyển sang chế độ sửa
    if (!myReviewForThisOrder) return
    setEditingReviewId(myReviewForThisOrder.id)
    setReviewRating(clampRating(myReviewForThisOrder.rating || 5))
    setReviewComment(String(myReviewForThisOrder.comment || ''))
  }, [myReviewForThisOrder])

  const startEdit = (r) => {
    setEditingReviewId(r.id)
    setReviewRating(clampRating(r.rating || 5))
    setReviewComment(String(r.comment || ''))
    setReviewError(null)
    try {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      // ignore
    }
  }

  const cancelEdit = () => {
    setEditingReviewId(null)
    setReviewRating(5)
    setReviewComment('')
    setReviewHover(null)
    setReviewError(null)
  }

  const removeReview = async (rid) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return
    setReviewSaving(true)
    setReviewError(null)
    try {
      await api.deleteReview(rid)
      const rv = await api.getProductReviews(product.id)
      setReviews(Array.isArray(rv) ? rv : [])
      if (editingReviewId === rid) cancelEdit()
    } catch (err) {
      setReviewError(err.message || 'Không thể xóa đánh giá')
    } finally {
      setReviewSaving(false)
    }
  }

  if (loading) return <div className="loading">Đang tải...</div>
  if (error) return <div className="loading">Không tìm thấy sản phẩm hoặc lỗi kết nối.</div>
  if (!product) return null

  const descriptionParagraphs = String(product.description || '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
  const visibleDescriptionParagraphs = descriptionExpanded
    ? descriptionParagraphs
    : descriptionParagraphs.slice(0, 3)

  const reviewStats = (() => {
    const list = Array.isArray(reviews) ? reviews : []
    const count = list.length
    const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0)
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0
    const byStar = [0, 0, 0, 0, 0, 0] // 0..5
    for (const r of list) {
      const n = clampRating(r?.rating || 1)
      byStar[n] += 1
    }
    return { count, avg, byStar }
  })()

  const canAddToCart = (Number(product.stock) || 0) > 0

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
            <button type="button" className="main-image" onClick={() => setImageZoomOpen(true)}>
              <img src={product.images[selectedImage]} alt={product.name} />
            </button>
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
              <span className="current-price">{formatPrice(Number(product.price) || 0)}</span>
              {product.originalPrice && (
                <span className="discount">
                  -{Math.round((1 - (Number(product.price) || 0) / product.originalPrice) * 100)}%
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
                    onChange={(e) => {
                      const raw = Math.max(1, parseInt(e.target.value, 10) || 1)
                      const maxQty = Math.max(1, Number(product.stock) || 1)
                      setQuantity(Math.min(maxQty, raw))
                    }}
                    min="1"
                    max={Math.max(1, Number(product.stock) || 1)}
                  />
                  <button
                    onClick={() => {
                      setQuantity(Math.min(Math.max(1, Number(product.stock) || 1), quantity + 1))
                    }}
                    disabled={quantity >= (Number(product.stock) || 0)}
                  >
                    <FiPlus />
                  </button>
                </div>
                <span className={`stock-info ${(Number(product.stock) || 0) === 0 ? 'out-of-stock' : ''}`}>
                  {(Number(product.stock) || 0) > 0 ? `Còn ${Number(product.stock) || 0} sản phẩm` : 'Hết hàng'}
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
                {visibleDescriptionParagraphs.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                {descriptionParagraphs.length > 3 && (
                  <button
                    type="button"
                    className="product-description-toggle"
                    onClick={() => setDescriptionExpanded((prev) => !prev)}
                  >
                    {descriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}
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

        {imageZoomOpen && (
          <div className="product-image-lightbox" onClick={() => setImageZoomOpen(false)}>
            <button
              type="button"
              className="product-lightbox-nav product-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage((prev) => Math.max(0, prev - 1))
              }}
              disabled={selectedImage === 0}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <img src={product.images[selectedImage]} alt={product.name} onClick={(e) => e.stopPropagation()} />
            <button
              type="button"
              className="product-lightbox-nav product-lightbox-next"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage((prev) => Math.min(product.images.length - 1, prev + 1))
              }}
              disabled={selectedImage === product.images.length - 1}
              aria-label="Ảnh sau"
            >
              ›
            </button>
          </div>
        )}

        <section className="related-products" id="reviews" ref={reviewsRef}>
          <div className="reviews-head">
            <h2>Đánh giá</h2>
            <div className="reviews-actions">
              <select className="reviews-sort" value={reviewSort} onChange={(e) => setReviewSort(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="highest">Sao cao nhất</option>
                <option value="lowest">Sao thấp nhất</option>
              </select>
            </div>
          </div>

          <div className="reviews-layout">
            <div className="reviews-summary">
              <div className="reviews-avg">
                <div className="reviews-avg-number">{reviewStats.avg.toFixed(1)}</div>
                <div className="reviews-avg-stars" aria-label={`Trung bình ${reviewStats.avg} sao`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FiStar key={i} className={i < Math.round(reviewStats.avg) ? 'filled' : ''} />
                  ))}
                </div>
                <div className="reviews-avg-count">{reviewStats.count} đánh giá</div>
              </div>

              <div className="reviews-bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = reviewStats.byStar[star] || 0
                  const pct = reviewStats.count ? Math.round((n / reviewStats.count) * 100) : 0
                  return (
                    <div key={star} className="reviews-bar-row">
                      <span className="reviews-bar-label">{star}★</span>
                      <div className="reviews-bar-track" aria-hidden="true">
                        <div className="reviews-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="reviews-bar-value">{n}</span>
                    </div>
                  )
                })}
              </div>

              {!api.getToken() ? (
                <div className="reviews-note">
                  Đăng nhập để viết đánh giá.
                </div>
              ) : (
                <form onSubmit={submitReview} className="reviews-form">
                  <div className="reviews-form-head">
                    <h3>{editingReviewId ? 'Sửa đánh giá' : 'Viết đánh giá'}</h3>
                    {me?.name && <span className="reviews-who">Bạn: {me.name}</span>}
                  </div>

                  {reviewError && <p className="auth-error">{reviewError}</p>}

                  {orderIdFromQuery && (
                    <div className="reviews-note" style={{ background: 'transparent', borderStyle: 'solid' }}>
                      Đánh giá cho đơn <strong>#{orderIdFromQuery}</strong>.
                    </div>
                  )}

                  <div className="reviews-star-picker" onMouseLeave={() => setReviewHover(null)}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const value = i + 1
                      const active = (reviewHover ?? clampRating(reviewRating)) >= value
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`star-btn ${active ? 'active' : ''}`}
                          onMouseEnter={() => setReviewHover(value)}
                          onClick={() => setReviewRating(value)}
                          aria-label={`${value} sao`}
                          disabled={reviewSaving}
                        >
                          <FiStar />
                        </button>
                      )
                    })}
                    <span className="reviews-star-text">{clampRating(reviewRating)} / 5</span>
                  </div>

                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="Chia sẻ cảm nhận của bạn (tùy chọn)..."
                    maxLength={1500}
                    disabled={reviewSaving}
                  />
                  <div className="reviews-form-footer">
                    <span className="reviews-char">{String(reviewComment || '').length}/1500</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {editingReviewId && (
                        <button className="btn btn-outline" type="button" onClick={cancelEdit} disabled={reviewSaving}>
                          Hủy
                        </button>
                      )}
                      <button className="btn btn-primary" type="submit" disabled={reviewSaving}>
                        {reviewSaving ? 'Đang gửi...' : (editingReviewId ? 'Lưu' : 'Gửi đánh giá')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="reviews-list">
              {reviewsSorted.length === 0 ? (
                <div className="reviews-empty">
                  Chưa có đánh giá. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.
                </div>
              ) : (
                <div className="reviews-items">
                  {reviewsSorted.map((r) => {
                    const name = String(r.userName || '').trim() || 'Ẩn danh'
                    const stars = clampRating(r.rating || 1)
                    const isMine = me?.id && String(r.userId || '') === String(me.id)
                    return (
                      <div key={r.id} className="review-item">
                        <div className="review-avatar" aria-hidden="true">{initialsFromName(name)}</div>
                        <div className="review-main">
                          <div className="review-top">
                            <div className="review-meta">
                              <strong className="review-name">{name}</strong>
                              {r.verified && <span className="review-verified">Đã mua hàng</span>}
                              {r.orderId && <span className="review-order">#{String(r.orderId)}</span>}
                              {r.createdAt && <span className="review-date">{formatDate(r.createdAt)}</span>}
                            </div>
                            <div className="review-stars" aria-label={`${stars} sao`}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <FiStar key={i} className={i < stars ? 'filled' : ''} />
                              ))}
                            </div>
                          </div>
                          {String(r.comment || '').trim() && (
                            <p className="review-comment">{String(r.comment || '').trim()}</p>
                          )}
                          {isMine && (
                            <div className="review-actions">
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(r)} disabled={reviewSaving}>
                                Sửa
                              </button>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => removeReview(r.id)} disabled={reviewSaving}>
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProductDetail
