import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import './Header.css'

const CATEGORIES = [
  { name: 'Vợt Cầu Lông', path: '/products?category=vot' }
]

const Header = ({ user: userProp }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [user, setUser] = useState(userProp ?? null)
  const [availableCategoryValues, setAvailableCategoryValues] = useState([])
  const { getTotalItems } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    if (userProp !== undefined) {
      setUser(userProp)
      return
    }

    if (api.getToken()) {
      api.getMe()
        .then((data) => setUser(data))
        .catch(() => {
          api.logout()
          setUser(null)
        })
    } else {
      setUser(null)
    }
  }, [userProp])

  useEffect(() => {
    api.getCategories()
      .then((list) => {
        setAvailableCategoryValues((list || []).map((item) => item.value).filter(Boolean))
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    api.logout()
    setUser(null)
    navigate('/')
  }

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((cat) => {
      const categoryKey = cat.path.split('category=')[1]
      return !categoryKey || availableCategoryValues.includes(categoryKey)
    }),
    [availableCategoryValues]
  )

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${searchQuery}`)
      setSearchQuery('')
      setSuggestOpen(false)
    }
  }

  // Auto-suggest (debounce 300ms)
  useEffect(() => {
    if (!suggestOpen) return
    const q = searchQuery.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    setSuggestLoading(true)
    const t = setTimeout(() => {
      api.getProductSuggestions(q, 8)
        .then((list) => setSuggestions(Array.isArray(list) ? list : []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, suggestOpen])

  const isAdmin = user?.role === 'admin'

  return (
    <header className="header" onClick={() => setSuggestOpen(false)}>
      <div className="header-top">
        <div className="container">
          <div className="header-top-content">
            <div className="header-info">
              <span>📞 Hotline: 0977508430</span>
              <span>🚚 Vận chuyển toàn quốc</span>
            </div>
            <div className="header-actions">
              {user ? (
                <>
                  <span className="header-greeting">Xin chào, {user.name}</span>
                  {user.role !== 'admin' && <Link to="/orders">Đơn hàng của tôi</Link>}
                  {isAdmin && (
                    <>
                      <Link to="/admin/dashboard">Dashboard</Link>
                      <Link to="/admin/orders">Đơn hàng</Link>
                      <Link to="/admin/products">Quản trị</Link>
                    </>
                  )}
                  {!isAdmin && <Link to="/account">Tài khoản</Link>}
                  <button type="button" className="header-logout" onClick={handleLogout}>
                    <FiLogOut /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">Đăng nhập</Link>
                  <Link to="/register">Đăng ký</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <span className="logo-text">ShopTD</span>
              <span className="logo-subtitle">Cầu Lông Chuyên Nghiệp</span>
            </Link>

            {!isAdmin && (
              <form className="search-form" onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSuggestOpen(true)
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">
                  <FiSearch />
                </button>

                {suggestOpen && (suggestions.length > 0 || suggestLoading) && (
                  <div className="search-suggest">
                    {suggestLoading && <div className="search-suggest-item muted">Đang tìm...</div>}
                    {!suggestLoading && suggestions.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="search-suggest-item"
                        onClick={() => {
                          navigate(`/products/${p.id}`)
                          setSuggestOpen(false)
                          setSearchQuery('')
                        }}
                      >
                        <img src={p.image} alt="" className="search-suggest-thumb" />
                        <div className="search-suggest-meta">
                          <div className="search-suggest-name">{p.name}</div>
                          <div className="search-suggest-sub">{p.brand}</div>
                        </div>
                        <div className="search-suggest-price">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price || 0)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}

            <div className="header-icons">
              {!isAdmin && (
                <>
                  <Link to="/cart" className="cart-icon">
                    <FiShoppingCart />
                    {getTotalItems() > 0 && (
                      <span className="cart-badge">{getTotalItems()}</span>
                    )}
                  </Link>
                  <Link to={user ? '/account' : '/login'} className="user-icon" title={user ? user.name : 'Đăng nhập'}>
                    <FiUser />
                  </Link>
                </>
              )}
              <button
                className="menu-toggle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <FiX /> : <FiMenu />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <nav className={`navbar ${isMenuOpen ? 'active' : ''}`}>
          <div className="container">
            <ul className="nav-menu">
              <li><Link to="/">Trang chủ</Link></li>

              <li className="nav-item-has-dropdown">
                <Link to="/products" className="nav-link-root">
                  Sản phẩm
                </Link>
                <div className="mega-menu">
                  <div className="mega-menu-inner">
                    {visibleCategories.map((cat, index) => (
                      <Link key={index} to={cat.path} className="mega-menu-link">
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </li>

              <li><Link to="/products?sale=true">Sale Off</Link></li>
              <li><Link to="/news">Tin tức</Link></li>
              <li><Link to="/contact">Liên hệ</Link></li>
            </ul>
          </div>
        </nav>
      )}
    </header>
  )
}

export default Header
