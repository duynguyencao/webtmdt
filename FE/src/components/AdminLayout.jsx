import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiBarChart2, FiBox, FiShoppingBag, FiUsers, FiLogOut } from 'react-icons/fi'
import { api } from '../api/client'
import './AdminLayout.css'
import './MobileBottomBar.css'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <FiBarChart2 /> },
  { to: '/admin/products', label: 'Sản phẩm', icon: <FiBox /> },
  { to: '/admin/orders', label: 'Đơn hàng', icon: <FiShoppingBag /> },
  { to: '/admin/users', label: 'Tài khoản', icon: <FiUsers /> }
]

const AdminLayout = ({ title, subtitle, children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    api.logout()
    navigate('/login', { replace: true })
    window.location.reload()
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar mobile-bottom-bar mobile-bottom-bar-admin">
        <Link to="/admin/dashboard" className="admin-brand">
          <span>ShopTD</span>
          <small>Admin Panel</small>
        </Link>
        <nav className="admin-nav">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to} className={`admin-nav-item mobile-bottom-bar-item ${active ? 'active' : ''}`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button type="button" className="admin-logout-btn mobile-bottom-bar-item" onClick={handleLogout}>
            <FiLogOut />
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="admin-content">{children}</div>
      </section>
    </div>
  )
}

export default AdminLayout
