import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut, FiHome } from 'react-icons/fi'
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [user, setUser] = useState(userProp ?? null)
  const [availableCategoryValues, setAvailableCategoryValues] = useState([])
  const { getTotalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setIsUserMenuOpen(false)
  }, [location.pathname])

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
      .catch(() => { })
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

  return (
    <header className="header" onClick={() => { setSuggestOpen(false); setIsUserMenuOpen(false); }}>

      <div className="header-main">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <span className="logo-text">ShopTD</span>
              {/* <span className="logo-subtitle">Cầu Lông Chuyên Nghiệp</span> */}
            </Link>

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

            <div className="header-icons">
              <Link to="/" className={`mobile-only-icon ${location.pathname === '/' ? 'active' : ''}`} title="Trang chủ">
                <FiHome />
                <span className="icon-label">Trang chủ</span>
              </Link>

              <Link to="/cart" className={`cart-icon ${location.pathname === '/cart' ? 'active' : ''}`}>
                <FiShoppingCart />
                {getTotalItems() > 0 && (
                  <span className="cart-badge">{getTotalItems()}</span>
                )}
                <span className="icon-label">Giỏ hàng</span>
              </Link>

              <span className="chatbot-slot" aria-hidden="true" />

              <div className="user-menu-container" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`user-icon ${['/account', '/orders', '/login', '/register'].some((path) => location.pathname.startsWith(path)) ? 'active' : ''}`}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  title={user ? user.name : 'Tài khoản'}
                >
                  <FiUser />
                  <span className="icon-label">Tài khoản</span>
                </button>
                {isUserMenuOpen && (
                  <div className="user-dropdown">
                    {user ? (
                      <>
                        <div className="user-dropdown-header">
                          <strong>Xin chào, {user.name}</strong>
                        </div>
                        <Link to="/account" onClick={() => setIsUserMenuOpen(false)}>Tài khoản</Link>
                        <Link to="/orders" onClick={() => setIsUserMenuOpen(false)}>Đơn hàng của tôi</Link>
                        <button type="button" className="user-dropdown-logout" onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}>
                          <FiLogOut /> Đăng xuất
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setIsUserMenuOpen(false)}>Đăng nhập</Link>
                        <Link to="/register" onClick={() => setIsUserMenuOpen(false)}>Đăng ký</Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                className={`menu-toggle ${isMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <FiX /> : <FiMenu />}
                <span className="icon-label">Danh mục</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav className={`navbar ${isMenuOpen ? 'active' : ''}`}>
        <div className="container">
          <ul className="nav-menu">
            <li><Link to="/" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link></li>

            <li className="nav-item-has-dropdown">
              <Link to="/products" className="nav-link-root" onClick={() => setIsMenuOpen(false)}>
                Sản phẩm
              </Link>
              <div className="mega-menu">
                <div className="mega-menu-inner">
                  {visibleCategories.map((cat, index) => (
                    <Link key={index} to={cat.path} className="mega-menu-link" onClick={() => setIsMenuOpen(false)}>
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </li>

            <li><Link to="/products?sale=true" onClick={() => setIsMenuOpen(false)}>Sale Off</Link></li>
            <li><Link to="/news" onClick={() => setIsMenuOpen(false)}>Tin tức</Link></li>
            <li><Link to="/contact" onClick={() => setIsMenuOpen(false)}>Liên hệ</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

export default Header
