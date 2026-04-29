import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import AdminLayout from '../components/AdminLayout'
import './AdminOrderDetail.css'

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

const formatDate = (str) => {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const paymentLabel = (method) => {
  if (method === 'cod') return 'Thanh toán khi nhận hàng (COD)'
  if (method === 'payos') return 'PayOS (Chuyển khoản)'
  return method || 'COD'
}

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
}

const AdminOrderDetail = () => {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [user, setUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadOrder = () => api.getOrderDetail(orderId).then(setOrder)

  useEffect(() => {
    api.getMe()
      .then((u) => {
        setUser(u)
        if (u.role !== 'admin') {
          navigate('/', { replace: true })
          return
        }
        return loadOrder()
      })
      .then((data) => {
        if (data) setOrder(data)
      })
      .catch((err) => {
        setError(err.message)
        if (err.message?.includes('Không tìm thấy')) return
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate, orderId])

  const handleConfirm = async (e) => {
    e.stopPropagation()
    if (actionLoading || (order?.status && order.status !== 'pending')) return
    setActionLoading(true)
    try {
      await api.confirmOrder(orderId)
      await loadOrder()
    } catch (err) {
      alert(err.message || 'Không xác nhận được đơn')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (e) => {
    e.stopPropagation()
    if (actionLoading) return
    const s = order?.status || 'pending'
    if (!['pending', 'confirmed'].includes(s)) return
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return
    setActionLoading(true)
    try {
      await api.cancelOrder(orderId)
      await loadOrder()
    } catch (err) {
      alert(err.message || 'Không hủy được đơn')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-order-detail-page">
        <div className="container">
          <div className="admin-loading">Đang tải chi tiết đơn hàng...</div>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <AdminLayout title="Chi tiết đơn hàng" subtitle="Xử lý trạng thái đơn theo thời gian thực">
        <div className="admin-order-detail-page">
          <p className="admin-order-detail-error">{error}</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/orders')}>
            Quay lại danh sách đơn hàng
          </button>
        </div>
      </AdminLayout>
    )
  }

  if (!user || user.role !== 'admin') return null
  if (!order) return null

  return (
    <AdminLayout title={`Chi tiết đơn #${order.orderId}`} subtitle="Xem thông tin khách hàng, sản phẩm và thanh toán">
      <div className="admin-order-detail-page">
        <div className="admin-order-detail-header">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/orders')}>
            ← Quay lại danh sách
          </button>
          <h1>Chi tiết đơn hàng #{order.orderId}</h1>
          <span className={`admin-order-detail-status admin-order-detail-status-${order.status || 'pending'}`}>
            {STATUS_LABELS[order.status] || STATUS_LABELS.pending}
          </span>
          <span className="admin-order-detail-date">{formatDate(order.createdAt)}</span>
          {['payos'].includes((order.paymentMethod || '').toLowerCase()) && order.paymentStatus !== 'paid' && (
            <span className="admin-order-detail-payment-status admin-order-detail-payment-status-pending">
              Chưa thanh toán
            </span>
          )}
          {['payos'].includes((order.paymentMethod || '').toLowerCase()) && order.paymentStatus === 'paid' && (
            <span className="admin-order-detail-payment-status admin-order-detail-payment-status-paid">
              Đã thanh toán
            </span>
          )}
              {(order.status === 'pending' || order.status === 'confirmed') && (
            <div className="admin-order-detail-actions">
              {order.status === 'pending' && (order.paymentMethod || '').toLowerCase() === 'cod' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={actionLoading}>
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận đơn'}
                </button>
              )}
              {(order.paymentMethod || '').toLowerCase() === 'payos' && order.paymentStatus !== 'paid' && (
                <span className="admin-order-detail-paid-hint">Đang chờ PayOS xác nhận thanh toán...</span>
              )}
              {['pending', 'confirmed'].includes(order.status) && (
                <button type="button" className="btn btn-outline btn-sm btn-danger" onClick={handleCancel} disabled={actionLoading}>
                  Hủy đơn
                </button>
              )}
            </div>
          )}
        </div>

        <div className="admin-order-detail-card">
          <h2>Thông tin khách hàng</h2>
          <dl className="admin-order-detail-dl">
            <dt>Họ tên</dt>
            <dd>{order.customer?.name || '—'}</dd>
            <dt>Số điện thoại</dt>
            <dd>{order.customer?.phone || '—'}</dd>
            <dt>Email</dt>
            <dd>{order.customer?.email || '—'}</dd>
            <dt>Địa chỉ</dt>
            <dd>{order.customer?.address || '—'}</dd>
          </dl>
        </div>

        <div className="admin-order-detail-card">
          <h2>Danh sách sản phẩm</h2>
          <div className="admin-order-detail-table-wrap">
            <table className="admin-order-detail-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn giá</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="admin-order-detail-item-name">{item.name}</div>
                      {item.brand && <div className="admin-order-detail-item-brand">{item.brand}</div>}
                    </td>
                    <td>{formatPrice(item.price)}</td>
                    <td>{item.quantity ?? 1}</td>
                    <td>{formatPrice((item.price || 0) * (item.quantity || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-order-detail-card">
          <h2>Thanh toán & Ghi chú</h2>
          <dl className="admin-order-detail-dl">
            <dt>Phương thức thanh toán</dt>
            <dd>{paymentLabel(order.paymentMethod)}</dd>
            {['payos'].includes((order.paymentMethod || '').toLowerCase()) && (
              <>
                <dt>Trạng thái thanh toán</dt>
                <dd>{order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</dd>
              </>
            )}
            <dt>Tổng cộng</dt>
            <dd className="admin-order-detail-total">{formatPrice(order.total)}</dd>
            {order.note && (
              <>
                <dt>Ghi chú</dt>
                <dd>{order.note}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminOrderDetail
