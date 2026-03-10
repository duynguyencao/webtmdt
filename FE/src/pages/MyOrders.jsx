import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import './MyOrders.css'

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

const formatDate = (str) => {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
}

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const loadOrders = () => api.getMyOrders().then(setOrders)

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login?redirect=/orders', { replace: true })
      return
    }
    loadOrders()
      .catch((err) => setError(err.message || 'Không tải được đơn hàng'))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleCancel = async (orderId) => {
    if (cancellingId) return
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return
    setCancellingId(orderId)
    try {
      await api.cancelOrderByBuyer(orderId)
      await loadOrders()
    } catch (err) {
      alert(err.message || 'Không hủy được đơn')
    } finally {
      setCancellingId(null)
    }
  }

  if (!api.getToken()) return null

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="container">
          <div className="my-orders-loading">Đang tải đơn hàng...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-orders-page">
        <div className="container">
          <h1 className="page-title">Đơn hàng của tôi</h1>
          <p className="my-orders-error">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-orders-page">
      <div className="container">
        <h1 className="page-title">Đơn hàng của tôi</h1>
        {orders.length === 0 ? (
          <div className="my-orders-empty">
            <p>Bạn chưa có đơn hàng nào.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/products')}>
              Mua sắm ngay
            </button>
          </div>
        ) : (
          <div className="my-orders-list">
            {orders.map((order) => (
              <div key={order.orderId} className="order-card">
                <div className="order-card-header">
                  <span
                    className="order-id order-id-link"
                    onClick={() => navigate(`/orders/${order.orderId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.orderId}`)}
                    role="button"
                    tabIndex={0}
                  >
                    #{order.orderId}
                  </span>
                  <span className={`order-status order-status-${order.status || 'pending'}`}>
                    {STATUS_LABELS[order.status] || STATUS_LABELS.pending}
                  </span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>
                <div className="order-card-body">
                  <p className="order-customer">
                    Người nhận: <strong>{order.customer?.name}</strong> · {order.customer?.phone}
                  </p>
                  <p className="order-address">{order.customer?.address}</p>
                  <ul className="order-items-preview">
                    {order.items?.slice(0, 3).map((item, i) => (
                      <li key={i}>
                        {item.name} x{item.quantity} — {formatPrice(item.price * (item.quantity || 1))}
                      </li>
                    ))}
                    {order.items?.length > 3 && (
                      <li className="order-more">+{order.items.length - 3} sản phẩm khác</li>
                    )}
                  </ul>
                </div>
                <div className="order-card-footer">
                  <span className="order-total">{formatPrice(order.total)}</span>
                  <span className="order-payment">
                    Thanh toán:{' '}
                    {order.paymentMethod === 'cod'
                      ? 'COD'
                      : order.paymentMethod === 'bank_transfer'
                        ? 'Chuyển khoản ngân hàng'
                        : order.paymentMethod || 'COD'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm order-detail-btn"
                    onClick={() => navigate(`/orders/${order.orderId}`)}
                  >
                    Xem chi tiết
                  </button>
                  {(order.status || 'pending') === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm order-cancel-btn"
                      onClick={() => handleCancel(order.orderId)}
                      disabled={cancellingId === order.orderId}
                    >
                      {cancellingId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyOrders
