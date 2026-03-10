import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiFilter, FiX } from 'react-icons/fi'
import ProductCard from '../components/ProductCard'
import { api } from '../api/client'
import './Products.css'

const Products = () => {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    brand: '',
    priceRange: '',
    sort: 'newest'
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await api.getProducts()
        setProducts(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      category: searchParams.get('category') || '',
      search: searchParams.get('search') || ''
    }))
  }, [searchParams])

  useEffect(() => {
    let filtered = [...products]

    if (filters.category) filtered = filtered.filter(p => p.category === filters.category)
    if (filters.search) {
      const q = filters.search.toLowerCase().trim()
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      )
    }
    if (filters.brand) filtered = filtered.filter(p => p.brand === filters.brand)
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number)
      filtered = filtered.filter(p => (max ? p.price >= min && p.price <= max : p.price >= min))
    }
    switch (filters.sort) {
      case 'price-low': filtered.sort((a, b) => a.price - b.price); break
      case 'price-high': filtered.sort((a, b) => b.price - a.price); break
      case 'rating': filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
      default: filtered.sort((a, b) => b.id - a.id)
    }
    setFilteredProducts(filtered)
  }, [filters, products])

  const brands = [...new Set(products.map(p => p.brand))]

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1 className="page-title">Sản Phẩm</h1>
          <div className="products-actions">
            <button
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter />
              Bộ lọc
            </button>
            <select
              className="sort-select"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="newest">Mới nhất</option>
              <option value="price-low">Giá: Thấp đến cao</option>
              <option value="price-high">Giá: Cao đến thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>
        </div>

        <div className="products-layout">
          <aside className={`filters-sidebar ${showFilters ? 'active' : ''}`}>
            <div className="filters-header">
              <h2>Bộ lọc</h2>
              <button onClick={() => setShowFilters(false)} className="close-filters">
                <FiX />
              </button>
            </div>

            <div className="filter-group">
              <h3 className="filter-title">Danh mục</h3>
              <div className="filter-options">
                <label>
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={filters.category === ''}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Tất cả
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="vot"
                    checked={filters.category === 'vot'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Vợt Cầu Lông
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="giay"
                    checked={filters.category === 'giay'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Giày Cầu Lông
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="ao"
                    checked={filters.category === 'ao'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Áo Cầu Lông
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="quan"
                    checked={filters.category === 'quan'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Quần Cầu Lông
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="tui"
                    checked={filters.category === 'tui'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Túi Vợt
                </label>
                <label>
                  <input
                    type="radio"
                    name="category"
                    value="phu-kien"
                    checked={filters.category === 'phu-kien'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />
                  Phụ Kiện
                </label>
              </div>
            </div>

            <div className="filter-group">
              <h3 className="filter-title">Thương hiệu</h3>
              <div className="filter-options">
                <label>
                  <input
                    type="radio"
                    name="brand"
                    value=""
                    checked={filters.brand === ''}
                    onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  />
                  Tất cả
                </label>
                {brands.map(brand => (
                  <label key={brand}>
                    <input
                      type="radio"
                      name="brand"
                      value={brand}
                      checked={filters.brand === brand}
                      onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                    />
                    {brand}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3 className="filter-title">Khoảng giá</h3>
              <div className="filter-options">
                <label>
                  <input
                    type="radio"
                    name="priceRange"
                    value=""
                    checked={filters.priceRange === ''}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  />
                  Tất cả
                </label>
                <label>
                  <input
                    type="radio"
                    name="priceRange"
                    value="0-1000000"
                    checked={filters.priceRange === '0-1000000'}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  />
                  Dưới 1 triệu
                </label>
                <label>
                  <input
                    type="radio"
                    name="priceRange"
                    value="1000000-3000000"
                    checked={filters.priceRange === '1000000-3000000'}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  />
                  1 - 3 triệu
                </label>
                <label>
                  <input
                    type="radio"
                    name="priceRange"
                    value="3000000-5000000"
                    checked={filters.priceRange === '3000000-5000000'}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  />
                  3 - 5 triệu
                </label>
                <label>
                  <input
                    type="radio"
                    name="priceRange"
                    value="5000000-999999999"
                    checked={filters.priceRange === '5000000-999999999'}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  />
                  Trên 5 triệu
                </label>
              </div>
            </div>

            <button
              className="clear-filters"
              onClick={() => setFilters({ category: '', search: '', brand: '', priceRange: '', sort: 'newest' })}
            >
              Xóa bộ lọc
            </button>
          </aside>

          <div className="products-content">
            <div className="products-info">
              <p>
                Tìm thấy <strong>{filteredProducts.length}</strong> sản phẩm
                {filters.search && <span> cho &quot;{filters.search}&quot;</span>}
              </p>
            </div>
            {loading ? (
              <p className="loading-text">Đang tải...</p>
            ) : error ? (
              <p className="error-text">Không tải được sản phẩm. Kiểm tra backend và MongoDB.</p>
            ) : filteredProducts.length > 0 ? (
              <div className="products-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="no-products">
                <p>Không tìm thấy sản phẩm nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Products
