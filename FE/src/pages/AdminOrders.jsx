import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { api } from '../api/client'
import './AdminOrders.css'

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

const formatDate = (str) => {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
}

const AdminOrders = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchOrderId, setSearchOrderId] = useState('')
  const [searching, setSearching] = useState(false)

  const loadOrders = (params = {}) => {
    return api.getOrders(params).then(setOrders)
  }

  useEffect(() => {
    api.getMe()
      .then((u) => {
        setUser(u)
        if (u.role !== 'admin') {
          navigate('/', { replace: true })
          return
        }
        return loadOrders()
      })
      .catch((err) => {
        setError(err.message)
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearching(true)
    loadOrders(searchOrderId.trim() ? { orderId: searchOrderId.trim() } : {})
      .finally(() => setSearching(false))
  }

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="container">
          <div className="admin-loading">Đang tải đơn hàng...</div>
        </div>
      </div>
    )
  }

  if (error || !user || user.role !== 'admin') return null

  return (
    <div className="admin-orders-page">
      <div className="container">
        <div className="admin-header">
          <h1>Quản lý đơn hàng</h1>
          <div className="admin-header-actions">
            <form className="admin-order-search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Tìm theo mã đơn (vd: ORD000001)"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                className="admin-order-search-input"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>
                <FiSearch /> {searching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/products')}>
              Quản lý sản phẩm
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="admin-empty">Chưa có đơn hàng nào.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Khách hàng</th>
                  <th>Số SP</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="admin-order-row-clickable"
                    onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                  >
                    <td><strong>{order.orderId}</strong></td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <span className={`admin-order-status admin-order-status-${order.status || 'pending'}`}>
                        {STATUS_LABELS[order.status] || STATUS_LABELS.pending}
                      </span>
                    </td>
                    <td>
                      <div>{order.customer?.name}</div>
                      <div className="admin-order-phone">{order.customer?.phone}</div>
                    </td>
                    <td>{order.items?.length ?? 0}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      {order.paymentMethod === 'cod'
                        ? 'COD'
                        : order.paymentMethod === 'bank_transfer'
                          ? 'Chuyển khoản ngân hàng'
                          : order.paymentMethod || 'COD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOrders
