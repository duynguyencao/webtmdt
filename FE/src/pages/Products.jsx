import React, { useEffect, useRef, useState } from 'react'
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
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 })
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: '',
    minPrice: 0,
    maxPrice: 0,
    saleOnly: searchParams.get('sale') === 'true',
    sort: 'newest'
  })
  const [activePriceThumb, setActivePriceThumb] = useState(null) // 'min' | 'max' | null
  const priceTrackRef = useRef(null)

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchParams.get('search') || '',
      saleOnly: searchParams.get('sale') === 'true'
    }))
  }, [searchParams])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await api.getProducts()
        setProducts(data)
        const prices = data.map((p) => Number(p.price) || 0)
        const min = prices.length ? Math.min(...prices) : 0
        const max = prices.length ? Math.max(...prices) : 0
        setPriceBounds({ min, max })
        setFilters((prev) => ({
          ...prev,
          minPrice: min,
          maxPrice: max
        }))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])


  useEffect(() => {
    let filtered = [...products]
    if (filters.search) {
      const q = filters.search.toLowerCase().trim()
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      )
    }
    if (filters.brand) filtered = filtered.filter(p => p.brand === filters.brand)
    if (filters.saleOnly) filtered = filtered.filter((p) => p.sale === true)
    filtered = filtered.filter((p) => {
      const price = Number(p.price) || 0
      return price >= filters.minPrice && price <= filters.maxPrice
    })
    switch (filters.sort) {
      case 'price-low': filtered.sort((a, b) => a.price - b.price); break
      case 'price-high': filtered.sort((a, b) => b.price - a.price); break
      case 'rating': filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
      default: filtered.sort((a, b) => b.id - a.id)
    }
    setFilteredProducts(filtered)
  }, [filters, products])

  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))]
  const formatVND = (n) => `${new Intl.NumberFormat('vi-VN').format(Number(n) || 0)}đ`

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  const getValueFromClientX = (clientX) => {
    const el = priceTrackRef.current
    if (!el) return filters.minPrice
    const rect = el.getBoundingClientRect()
    const ratio = rect.width ? (clientX - rect.left) / rect.width : 0
    const raw = priceBounds.min + ratio * (priceBounds.max - priceBounds.min)
    // Giá là số thực tế trong DB, nên lấy số nguyên để tương thích logic lọc
    return clamp(Math.round(raw), priceBounds.min, priceBounds.max)
  }

  useEffect(() => {
    if (!activePriceThumb) return
    const onMove = (e) => {
      const nextVal = getValueFromClientX(e.clientX)
      setFilters((prev) => {
        if (activePriceThumb === 'min') {
          return { ...prev, minPrice: Math.min(nextVal, prev.maxPrice) }
        }
        return { ...prev, maxPrice: Math.max(nextVal, prev.minPrice) }
      })
    }
    const onUp = () => setActivePriceThumb(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [activePriceThumb, priceBounds.min, priceBounds.max])

  const priceRangeDenom = Math.max(1, priceBounds.max - priceBounds.min)
  const minPct = ((filters.minPrice - priceBounds.min) / priceRangeDenom) * 100
  const maxPct = ((filters.maxPrice - priceBounds.min) / priceRangeDenom) * 100

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
              <div className="price-slider-group">
                <div className="price-slider-values">
                  <span>Từ: {formatVND(filters.minPrice)}</span>
                  <span>Đến: {formatVND(filters.maxPrice)}</span>
                </div>
                <div
                  className="price-dual-slider"
                  role="group"
                  aria-label="Chọn khoảng giá"
                >
                  <div
                    ref={priceTrackRef}
                    className="price-dual-track"
                    onPointerDown={(e) => {
                      const nextVal = getValueFromClientX(e.clientX)
                      const distToMin = Math.abs(nextVal - filters.minPrice)
                      const distToMax = Math.abs(nextVal - filters.maxPrice)
                      const nextThumb = distToMin <= distToMax ? 'min' : 'max'
                      setActivePriceThumb(nextThumb)
                      setFilters((prev) => {
                        if (nextThumb === 'min') {
                          return { ...prev, minPrice: Math.min(nextVal, prev.maxPrice) }
                        }
                        return { ...prev, maxPrice: Math.max(nextVal, prev.minPrice) }
                      })
                    }}
                  >
                    <div className="price-dual-range" style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }} />

                    <button
                      type="button"
                      className={`price-dual-thumb ${activePriceThumb === 'min' ? 'active' : ''}`}
                      style={{ left: `${minPct}%` }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setActivePriceThumb('min')
                      }}
                      aria-label="Kéo giá thấp"
                    />
                    <button
                      type="button"
                      className={`price-dual-thumb ${activePriceThumb === 'max' ? 'active' : ''}`}
                      style={{ left: `${maxPct}%` }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setActivePriceThumb('max')
                      }}
                      aria-label="Kéo giá cao"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              className="clear-filters"
              onClick={() => setFilters({
                search: '',
                brand: '',
                minPrice: priceBounds.min,
                maxPrice: priceBounds.max,
                saleOnly: false,
                sort: 'newest'
              })}
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
