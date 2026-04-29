import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import './MyOrders.css'
import './AdminDashboard.css'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import viLocale from 'date-fns/locale/vi'

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

const QUICK_DAYS = [7, 15, 30]

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const formatVNDate = (date) => {
  if (!date) return ''
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date()
    return startOfDay(addDays(now, -29))
  })
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(new Date()))

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

  const filteredOrders = useMemo(() => {
    const start = rangeStart ? new Date(rangeStart).getTime() : null
    const end = rangeEnd ? new Date(rangeEnd).getTime() : null
    if (start == null || end == null) return orders
    return orders.filter((o) => {
      const t = new Date(o.createdAt || 0).getTime()
      return t >= start && t <= end
    })
  }, [orders, rangeStart, rangeEnd])

  if (!api.getToken()) return null

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="container">
          <div className="my-orders-loading">Đang tải đơn hàng...</div>
          <div className="my-orders-skeleton">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div className="my-order-skeleton-card" key={idx} />
            ))}
          </div>
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
        <div className="my-orders-title-row">
          <h1 className="page-title">Đơn hàng của tôi</h1>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsRangeModalOpen(true)}
          >
            {rangeStart && rangeEnd ? `${formatVNDate(rangeStart)} - ${formatVNDate(rangeEnd)}` : 'Chọn ngày'}
          </button>
        </div>

        {isRangeModalOpen && (
          <div className="admin-date-modal-overlay" onClick={() => setIsRangeModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-date-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-date-modal-header">
                <div>
                  <div className="admin-date-modal-title">Chọn khoảng thời gian</div>
                  <div className="admin-date-modal-range">
                    <strong>{formatVNDate(rangeStart)}</strong> - <strong>{formatVNDate(rangeEnd)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-date-modal-close"
                  onClick={() => setIsRangeModalOpen(false)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              <div className="admin-date-picker-wrap">
                <DatePicker
                  inline
                  selectsRange
                  startDate={rangeStart}
                  endDate={rangeEnd}
                  onChange={(dates) => {
                    const [start, end] = dates
                    if (start) setRangeStart(startOfDay(start))
                    if (end) setRangeEnd(endOfDay(end))
                    if (!end) setRangeEnd(null)
                  }}
                  locale={viLocale}
                  calendarStartDay={1}
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={16}
                  shouldCloseOnSelect={false}
                />
              </div>

              <div className="admin-date-quick-row">
                {QUICK_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="admin-date-quick-pill"
                    onClick={() => {
                      const todayStart = startOfDay(new Date())
                      setRangeStart(startOfDay(addDays(todayStart, -(d - 1))))
                      setRangeEnd(endOfDay(todayStart))
                    }}
                  >
                    {d} Ngày
                  </button>
                ))}
              </div>

              <button type="button" className="admin-date-confirm-btn" onClick={() => setIsRangeModalOpen(false)}>
                Chọn ngày
              </button>
            </div>
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="my-orders-empty">
            <p>{orders.length === 0 ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn hàng nào trong khoảng thời gian đã chọn.'}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/products')}>
              Mua sắm ngay
            </button>
          </div>
        ) : (
          <div className="my-orders-list">
            {filteredOrders.map((order) => (
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
                      : order.paymentMethod === 'payos'
                        ? 'PayOS'
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
