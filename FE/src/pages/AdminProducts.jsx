import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AdminLayout from '../components/AdminLayout'
import NoticeToast from '../components/NoticeToast'
import './AdminProducts.css'

const CATEGORIES = [
  { value: 'vot', label: 'Vợt Cầu Lông' }
]

const emptyForm = () => ({
  name: '',
  brand: '',
  category: 'vot',
  originalPrice: '',
  image: '',
  description: '',
  stock: 0,
  discountPercent: 0
})

const AdminProducts = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [previewDescriptionExpanded, setPreviewDescriptionExpanded] = useState(false)
  const [zoomImageIndex, setZoomImageIndex] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadProgress, setUploadProgress] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortKey, setSortKey] = useState('id_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => (window.innerWidth <= 640 ? 6 : 10))
  const [notice, setNotice] = useState(null)

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 2200)
  }

  useEffect(() => {
    const onResize = () => {
      setPageSize(window.innerWidth <= 640 ? 6 : 10)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    api.getMe()
      .then((u) => {
        setUser(u)
        if (u.role !== 'admin') {
          navigate('/', { replace: true })
          return
        }
        return api.getProducts()
      })
      .then((list) => {
        if (list) setProducts(list)
      })
      .catch((err) => {
        setError(err.message)
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  useEffect(() => {
    if (zoomImageIndex == null) return
    const previewImages = Array.isArray(previewProduct?.images) && previewProduct.images.length > 0
      ? previewProduct.images
      : [previewProduct?.image].filter(Boolean)
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setZoomImageIndex(null)
      if (e.key === 'ArrowLeft') setZoomImageIndex((prev) => Math.max(0, prev - 1))
      if (e.key === 'ArrowRight') setZoomImageIndex((prev) => Math.min(previewImages.length - 1, prev + 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomImageIndex, previewProduct])

  const loadProducts = () => {
    api.getProducts().then(setProducts).catch(() => {})
  }

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm())
    setSubmitError(null)
    setImageFile(null)
    setImagePreview('')
    setFormOpen(true)
  }

  const openEdit = async (product) => {
    try {
      const full = await api.getProductDetail(product.id)
      setEditingId(product.id)
      setFormData({
        name: full.name || '',
        brand: full.brand || '',
        category: full.category || 'vot',
        originalPrice: full.originalPrice ?? '',
        image: full.image || (full.images && full.images[0]) || '',
        description: full.description || '',
        stock: full.stock ?? 0,
        discountPercent: full.originalPrice && full.price
          ? Math.max(0, Math.round((1 - full.price / full.originalPrice) * 100))
          : 0
      })
      setSubmitError(null)
      setImageFile(null)
      setImagePreview(full.image || (full.images && full.images[0]) || '')
      setFormOpen(true)
    } catch (err) {
      alert('Không thể tải thông tin sản phẩm: ' + err.message)
    }
  }

  const openPreview = async (product) => {
    try {
      const full = await api.getProductDetail(product.id)
      setPreviewProduct(full)
      setPreviewDescriptionExpanded(false)
      setPreviewOpen(true)
    } catch (err) {
      alert('Không thể tải thông tin sản phẩm: ' + err.message)
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(emptyForm())
    setImageFile(null)
    setImagePreview('')
  }

  const closePreview = () => {
    setPreviewOpen(false)
    setPreviewProduct(null)
    setPreviewDescriptionExpanded(false)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const parsedOriginalPrice = Number(formData.originalPrice) || 0
      const parsedDiscountPercent = Math.min(90, Math.max(0, Number(formData.discountPercent) || 0))
      const hasDiscount = parsedDiscountPercent > 0
      const finalPrice = Math.round(parsedOriginalPrice * (1 - parsedDiscountPercent / 100))

      if (parsedOriginalPrice <= 0) {
        setSubmitError('Giá gốc phải lớn hơn 0')
        setSubmitLoading(false)
        return
      }

      // --- Upload ảnh lên Supabase nếu có file mới ---
      let imageUrl = formData.image?.trim() || ''
      if (imageFile) {
        setUploadProgress(true)
        try {
          const uploadRes = await api.uploadProductImage(imageFile)
          imageUrl = uploadRes.url
        } catch (uploadErr) {
          setSubmitError('Upload ảnh thất bại: ' + uploadErr.message)
          setSubmitLoading(false)
          setUploadProgress(false)
          return
        }
        setUploadProgress(false)
      }

      if (!imageUrl) {
        setSubmitError('Vui lòng chọn ảnh sản phẩm')
        setSubmitLoading(false)
        return
      }

      const body = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        price: finalPrice,
        image: imageUrl,
        description: formData.description.trim(),
        stock: Number(formData.stock) || 0,
        sale: hasDiscount
      }
      body.originalPrice = parsedOriginalPrice
      body.discountPercent = parsedDiscountPercent
      if (editingId != null) {
        await api.updateProduct(editingId, body)
        loadProducts()
        closeForm()
        showNotice('Đã cập nhật sản phẩm')
      } else {
        await api.createProduct(body)
        loadProducts()
        closeForm()
        showNotice('Đã thêm sản phẩm')
      }
    } catch (err) {
      setSubmitError(err.message || 'Có lỗi xảy ra')
      showNotice(err.message || 'Không lưu được sản phẩm', 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn ẩn sản phẩm "${name}"?`)) return
    try {
      await api.deleteProduct(id)
      loadProducts()
      showNotice('Đã xóa sản phẩm')
    } catch (err) {
      showNotice(err.message || 'Không thể xóa sản phẩm', 'error')
    }
  }

  const formatPrice = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
  const calcDiscountPercent = (p) => {
    const original = Number(p?.originalPrice) || 0
    const price = Number(p?.price) || 0
    if (!original || price <= 0 || original <= 0) return 0
    if (price >= original) return 0
    return Math.round((1 - price / original) * 100)
  }

  if (loading) {
    return (
      <AdminLayout title="Quản lý sản phẩm" subtitle="Tạo, chỉnh sửa và kiểm soát tồn kho vợt cầu lông">
        <div className="admin-products-page">
          <div className="admin-loading">Đang tải sản phẩm...</div>
          <div className="admin-table-skeleton">
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <div className="admin-skeleton-row" key={rowIdx}>
                {Array.from({ length: 9 }).map((__, i) => (
                  <div className="admin-skeleton-cell" key={i} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }
  if (!user || user.role !== 'admin') return null

  const filteredProducts = products
    .filter((p) => {
      const q = searchText.trim().toLowerCase()
      if (!q) return true
      return String(p.name || '').toLowerCase().includes(q) || String(p.brand || '').toLowerCase().includes(q)
    })
    .filter((p) => {
      if (stockFilter === 'in_stock') return (Number(p.stock) || 0) > 0
      if (stockFilter === 'out_stock') return (Number(p.stock) || 0) <= 0
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0)
      if (sortKey === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0)
      if (sortKey === 'stock_asc') return (Number(a.stock) || 0) - (Number(b.stock) || 0)
      if (sortKey === 'stock_desc') return (Number(b.stock) || 0) - (Number(a.stock) || 0)
      return (Number(b.id) || 0) - (Number(a.id) || 0)
    })

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const page = Math.min(currentPage, totalPages)
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)
  const previewOriginalPrice = Math.max(0, Number(formData.originalPrice) || 0)
  const previewDiscountPercent = Math.min(90, Math.max(0, Number(formData.discountPercent) || 0))
  const previewSalePrice = previewOriginalPrice > 0
    ? Math.round(previewOriginalPrice * (1 - previewDiscountPercent / 100))
    : 0
  const previewDescription = String(previewProduct?.description || '')
  const shortPreviewDescription = previewDescription.length > 120
    ? `${previewDescription.slice(0, 120).trim()}...`
    : previewDescription
  const previewImages = Array.isArray(previewProduct?.images) && previewProduct.images.length > 0
    ? previewProduct.images
    : [previewProduct?.image].filter(Boolean)

  return (
    <AdminLayout title="Quản lý sản phẩm" subtitle="Tạo, chỉnh sửa và kiểm soát tồn kho vợt cầu lông">
      <NoticeToast message={notice?.message} type={notice?.type} />
      <div className="admin-products-page">
        <div className="admin-header">
          <h2>Danh sách sản phẩm</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              className="admin-filter-input"
              placeholder="Tìm theo tên/thương hiệu"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1) }}
            />
            <select className="admin-filter-input" value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1) }}>
              <option value="all">Tất cả tồn kho</option>
              <option value="in_stock">Còn hàng</option>
              <option value="out_stock">Hết hàng</option>
            </select>
            <select className="admin-filter-input" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="id_desc">Mới nhất</option>
              <option value="price_desc">Giá cao nhất</option>
              <option value="price_asc">Giá thấp nhất</option>
              <option value="stock_desc">Tồn kho cao nhất</option>
              <option value="stock_asc">Tồn kho thấp nhất</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              + Thêm sản phẩm
            </button>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ảnh</th>
                <th>Tên</th>
                <th>Thương hiệu</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th>Mô tả</th>
                <th>Tồn kho</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="admin-row-clickable"
                  onClick={() => openPreview(p)}
                >
                  <td>{p.id}</td>
                  <td>
                    <img src={p.image} alt="" className="admin-thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.brand}</td>
                  <td>{CATEGORIES.find((c) => c.value === p.category)?.label || p.category}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td className="admin-description-cell">{p.description || '—'}</td>
                  <td style={{ textAlign: 'center', color: (p.stock ?? 0) === 0 ? '#e53935' : 'inherit', fontWeight: (p.stock ?? 0) === 0 ? 600 : 400 }}>
                    {(p.stock ?? 0) === 0 ? 'Hết hàng' : p.stock}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && !error && <p className="admin-empty">Không tìm thấy sản phẩm phù hợp bộ lọc.</p>}
          {filteredProducts.length > 0 && (
            <div className="admin-pagination">
              <span>Trang {page}/{totalPages}</span>
              <div className="admin-pagination-actions">
                <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  Trước
                </button>
                <button type="button" className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {formOpen && (
          <div className="admin-modal" onClick={closeForm}>
            <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
              <form onSubmit={handleSubmit}>
                {submitError && <p className="auth-error">{submitError}</p>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Tên sản phẩm *</label>
                    <input name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Thương hiệu *</label>
                    <input name="brand" value={formData.brand} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Danh mục *</label>
                    <select name="category" value={formData.category} onChange={handleChange}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Giá gốc (VNĐ) *</label>
                    <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} required min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Giảm giá (%)</label>
                    <input type="number" name="discountPercent" value={formData.discountPercent} onChange={handleChange} min="0" max="90" />
                  </div>
                  <div className="form-group">
                    <label>Giá bán hiển thị</label>
                    <input value={previewSalePrice ? formatPrice(previewSalePrice) : '—'} readOnly />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Số lượng tồn</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Tiết kiệm</label>
                    <input value={previewOriginalPrice > 0 ? formatPrice(previewOriginalPrice - previewSalePrice) : '—'} readOnly />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ảnh sản phẩm *</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImageFile(file)
                        setImagePreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  {imagePreview && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: '180px',
                          maxHeight: '180px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </div>
                  )}
                  {editingId && !imageFile && formData.image && (
                    <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem' }}>
                      Ảnh hiện tại đang dùng. Chọn file mới để thay đổi.
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Mô tả *</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} required />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeForm}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitLoading || uploadProgress}>
                    {uploadProgress ? 'Đang upload ảnh...' : submitLoading ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {previewOpen && previewProduct && (
          <div className="admin-modal" onClick={closePreview}>
            <div className="admin-modal-content admin-preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Thông tin sản phẩm</h2>

              <div className="admin-preview-grid">
                <div className="admin-preview-image">
                  <button
                    type="button"
                    className="admin-preview-image-button"
                    onClick={() => setZoomImageIndex(0)}
                  >
                    <img
                      src={previewProduct.image || (previewProduct.images && previewProduct.images[0]) || ''}
                      alt={previewProduct.name}
                    />
                  </button>
                </div>

                <div className="admin-preview-meta">
                  <table className="admin-preview-table">
                    <tbody>
                      <tr>
                        <th>Tên</th>
                        <td>{previewProduct.name || '—'}</td>
                      </tr>
                      <tr>
                        <th>Thương hiệu</th>
                        <td>{previewProduct.brand || '—'}</td>
                      </tr>
                      <tr>
                        <th>Danh mục</th>
                        <td>{CATEGORIES.find((c) => c.value === previewProduct.category)?.label || previewProduct.category || '—'}</td>
                      </tr>
                      <tr>
                        <th>Giá</th>
                        <td>
                          {formatPrice(previewProduct.price || 0)}
                          {previewProduct.originalPrice ? (
                            <>
                              <span className="admin-preview-muted"> (gốc {formatPrice(previewProduct.originalPrice)})</span>
                            </>
                          ) : null}
                        </td>
                      </tr>
                      <tr>
                        <th>Giảm giá</th>
                        <td>
                          {(() => {
                            const percent = calcDiscountPercent(previewProduct)
                            if (!percent) return 'Không'
                            return `${percent}%`
                          })()}
                        </td>
                      </tr>
                      <tr>
                        <th>Tồn kho</th>
                        <td>{previewProduct.stock ?? 0}</td>
                      </tr>
                      <tr>
                        <th>Mô tả</th>
                        <td className="admin-preview-description">
                          {previewDescriptionExpanded ? (previewDescription || '—') : (shortPreviewDescription || '—')}
                          {previewDescription.length > 120 && (
                            <button
                              type="button"
                              className="admin-description-toggle"
                              onClick={() => setPreviewDescriptionExpanded((prev) => !prev)}
                            >
                              {previewDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions admin-preview-actions">
                <button type="button" className="btn btn-outline" onClick={closePreview}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    closePreview()
                    openEdit(previewProduct)
                  }}
                >
                  Sửa sản phẩm
                </button>
              </div>
            </div>
          </div>
        )}

        {zoomImageIndex != null && (
          <div className="admin-image-lightbox" onClick={() => setZoomImageIndex(null)}>
            <button
              type="button"
              className="admin-lightbox-nav admin-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation()
                setZoomImageIndex((prev) => Math.max(0, prev - 1))
              }}
              disabled={zoomImageIndex === 0}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <img src={previewImages[zoomImageIndex]} alt="" onClick={(e) => e.stopPropagation()} />
            <button
              type="button"
              className="admin-lightbox-nav admin-lightbox-next"
              onClick={(e) => {
                e.stopPropagation()
                setZoomImageIndex((prev) => Math.min(previewImages.length - 1, prev + 1))
              }}
              disabled={zoomImageIndex === previewImages.length - 1}
              aria-label="Ảnh sau"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminProducts
