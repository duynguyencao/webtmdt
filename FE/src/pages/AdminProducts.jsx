import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import './AdminProducts.css'

const CATEGORIES = [
  { value: 'vot', label: 'Vợt Cầu Lông' },
  { value: 'giay', label: 'Giày Cầu Lông' },
  { value: 'ao', label: 'Áo Cầu Lông' },
  { value: 'quan', label: 'Quần Cầu Lông' },
  { value: 'tui', label: 'Túi Vợt' },
  { value: 'phu-kien', label: 'Phụ Kiện' }
]

const emptyForm = () => ({
  name: '',
  brand: '',
  category: 'vot',
  price: '',
  originalPrice: '',
  image: '',
  description: '',
  stock: 0,
  sale: false
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

  const loadProducts = () => {
    api.getProducts().then(setProducts).catch(() => {})
  }

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm())
    setSubmitError(null)
    setFormOpen(true)
  }

  const openEdit = (product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'vot',
      price: product.price ?? '',
      originalPrice: product.originalPrice ?? '',
      image: product.image || '',
      description: product.description || '',
      stock: product.stock ?? 0,
      sale: product.sale ?? false
    })
    setSubmitError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(emptyForm())
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
      const body = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        price: Number(formData.price) || 0,
        image: formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        stock: Number(formData.stock) || 0,
        sale: formData.sale
      }
      if (formData.originalPrice) body.originalPrice = Number(formData.originalPrice)
      if (editingId != null) {
        await api.updateProduct(editingId, body)
        loadProducts()
        closeForm()
      } else {
        await api.createProduct(body)
        loadProducts()
        closeForm()
      }
    } catch (err) {
      setSubmitError(err.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"?`)) return
    try {
      await api.deleteProduct(id)
      loadProducts()
    } catch (err) {
      alert(err.message || 'Không thể xóa')
    }
  }

  const formatPrice = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  if (loading) return <div className="admin-loading">Đang kiểm tra quyền...</div>
  if (!user || user.role !== 'admin') return null

  return (
    <div className="admin-products-page">
      <div className="container">
        <div className="admin-header">
          <h1>Quản lý sản phẩm</h1>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            + Thêm sản phẩm
          </button>
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
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    <img src={p.image} alt="" className="admin-thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.brand}</td>
                  <td>{CATEGORIES.find((c) => c.value === p.category)?.label || p.category}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>
                      Sửa
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.name)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && !error && <p className="admin-empty">Chưa có sản phẩm nào.</p>}
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
                    <label>Giá (VNĐ) *</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Giá gốc (VNĐ)</label>
                    <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Số lượng tồn</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>URL ảnh *</label>
                  <input name="image" value={formData.image} onChange={handleChange} required placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" name="sale" checked={formData.sale} onChange={handleChange} />
                    Đang giảm giá
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeForm}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                    {submitLoading ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminProducts
