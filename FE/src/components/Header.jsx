import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState(null)
  const { getTotalItems } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
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
  }, [])

  const handleLogout = () => {
    api.logout()
    setUser(null)
    navigate('/')
  }

  const categories = [
    { name: 'Vợt Cầu Lông', path: '/products?category=vot' },
    { name: 'Giày Cầu Lông', path: '/products?category=giay' },
    { name: 'Áo Cầu Lông', path: '/products?category=ao' },
    { name: 'Quần Cầu Lông', path: '/products?category=quan' },
    { name: 'Túi Vợt', path: '/products?category=tui' },
    { name: 'Balo', path: '/products?category=balo' },
    { name: 'Phụ Kiện', path: '/products?category=phu-kien' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${searchQuery}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="header">
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
                  {user.role === 'admin' && (
                    <>
                      <Link to="/admin/orders">Đơn hàng</Link>
                      <Link to="/admin/products">Quản trị</Link>
                    </>
                  )}
                  <Link to="/account">Tài khoản</Link>
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

            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                <FiSearch />
              </button>
            </form>

            <div className="header-icons">
              <Link to="/cart" className="cart-icon">
                <FiShoppingCart />
                {getTotalItems() > 0 && (
                  <span className="cart-badge">{getTotalItems()}</span>
                )}
              </Link>
              <Link to={user ? '/account' : '/login'} className="user-icon" title={user ? user.name : 'Đăng nhập'}>
                <FiUser />
              </Link>
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
                  {categories.map((cat, index) => (
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
    </header>
  )
}

export default Header
