import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import './MyOrderDetail.css'

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

const MyOrderDetail = () => {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [payosLoading, setPayosLoading] = useState(false)
  const [payosError, setPayosError] = useState(null)

  const loadOrder = () => api.getOrderDetail(orderId).then(setOrder)

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login?redirect=/orders/' + encodeURIComponent(orderId), { replace: true })
      return
    }
    loadOrder()
      .catch((err) => setError(err.message || 'Không tải được đơn hàng'))
      .finally(() => setLoading(false))
  }, [navigate, orderId])

  const handleCancel = async (e) => {
    e.preventDefault()
    if (cancelling || (order?.status || 'pending') !== 'pending') return
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return
    setCancelling(true)
    try {
      await api.cancelOrderByBuyer(orderId)
      await loadOrder()
    } catch (err) {
      alert(err.message || 'Không hủy được đơn')
    } finally {
      setCancelling(false)
    }
  }

  const handlePayOSRetry = async () => {
    if (payosLoading) return
    setPayosLoading(true)
    setPayosError(null)
    try {
      const resp = await api.getOrderPaymentLink(orderId)
      const url = resp?.paymentUrl
      if (!url) throw new Error('Không lấy được link PayOS. Vui lòng thử lại sau.')
      window.location.href = url
    } catch (err) {
      setPayosError(err.message || 'Không thể mở PayOS để thanh toán lại')
    } finally {
      setPayosLoading(false)
    }
  }

  if (!api.getToken()) return null

  if (loading) {
    return (
      <div className="my-order-detail-page">
        <div className="container">
          <div className="my-order-detail-loading">Đang tải chi tiết đơn hàng...</div>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="my-order-detail-page">
        <div className="container">
          <p className="my-order-detail-error">{error}</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/orders')}>
            Quay lại đơn hàng của tôi
          </button>
        </div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="my-order-detail-page">
      <div className="container">
        <div className="my-order-detail-header">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/orders')}>
            ← Quay lại đơn hàng của tôi
          </button>
          <h1>Chi tiết đơn hàng #{order.orderId}</h1>
          <span className={`my-order-detail-status my-order-detail-status-${order.status || 'pending'}`}>
            {STATUS_LABELS[order.status] || STATUS_LABELS.pending}
          </span>
          <span className="my-order-detail-date">{formatDate(order.createdAt)}</span>
          {(order.paymentMethod || '').toLowerCase() === 'payos' && order.paymentStatus !== 'paid' && (
            <span className="my-order-detail-payment-status my-order-detail-payment-status-pending">
              Chưa thanh toán
            </span>
          )}
          {(order.paymentMethod || '').toLowerCase() === 'payos' && order.paymentStatus === 'paid' && (
            <span className="my-order-detail-payment-status my-order-detail-payment-status-paid">
              Đã thanh toán
            </span>
          )}
          {(order.status || 'pending') === 'pending' && (
            <div className="my-order-detail-actions">
              <button type="button" className="btn btn-outline btn-sm btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            </div>
          )}
        </div>

        <div className="my-order-detail-card">
          <h2>Thông tin nhận hàng</h2>
          <dl className="my-order-detail-dl">
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

        <div className="my-order-detail-card">
          <h2>Danh sách sản phẩm</h2>
          <div className="my-order-detail-table-wrap">
            <table className="my-order-detail-table">
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
                      <div className="my-order-detail-item-name">{item.name}</div>
                      {item.brand && <div className="my-order-detail-item-brand">{item.brand}</div>}
                      {(order.status || 'pending') === 'delivered' && item?.id != null && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/products/${Number(item.id)}?orderId=${encodeURIComponent(order.orderId)}#reviews`)}
                          >
                            Đánh giá / Sửa đánh giá
                          </button>
                        </div>
                      )}
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

        {(order.paymentMethod || '').toLowerCase() === 'payos' && order.paymentStatus !== 'paid' && (
          <div className="my-order-detail-card">
            <h2>Thanh toán qua PayOS</h2>
            <p>Đơn hàng này sẽ được xác nhận tự động khi giao dịch PayOS thành công.</p>
            <p className="my-order-detail-bank-note">
              Bạn có thể mở lại PayOS từ màn hình thanh toán trước đó. Hiện tại, hệ thống đang chờ webhook cập nhật trạng thái.
            </p>
            {payosError && <p className="my-order-detail-error">{payosError}</p>}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePayOSRetry}
              disabled={payosLoading}
            >
              {payosLoading ? 'Đang lấy link PayOS...' : 'Thanh toán lại'}
            </button>
          </div>
        )}

        <div className="my-order-detail-card">
          <h2>Thanh toán & Ghi chú</h2>
          <dl className="my-order-detail-dl">
            <dt>Phương thức thanh toán</dt>
            <dd>{paymentLabel(order.paymentMethod)}</dd>
            {(order.paymentMethod || '').toLowerCase() === 'payos' && (
              <>
                <dt>Trạng thái thanh toán</dt>
                <dd>{order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</dd>
              </>
            )}
            <dt>Tổng cộng</dt>
            <dd className="my-order-detail-total">{formatPrice(order.total)}</dd>
            {order.note && (
              <>
                <dt>Ghi chú</dt>
                <dd>{order.note}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

export default MyOrderDetail
