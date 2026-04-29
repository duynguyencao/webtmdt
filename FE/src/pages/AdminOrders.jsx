import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiDownload, FiSearch } from 'react-icons/fi'
import { api } from '../api/client'
import AdminLayout from '../components/AdminLayout'
import './AdminOrders.css'
import './AdminDashboard.css'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import viLocale from 'date-fns/locale/vi'

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

const AdminOrders = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchOrderId, setSearchOrderId] = useState('')
  const [searching, setSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('createdAt_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date()
    return startOfDay(addDays(now, -29))
  })
  const [rangeEnd, setRangeEnd] = useState(() => {
    const now = new Date()
    return endOfDay(now)
  })

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

  const handleQuickDays = (days) => {
    const todayStart = startOfDay(new Date())
    setRangeStart(startOfDay(addDays(todayStart, -(days - 1))))
    setRangeEnd(endOfDay(todayStart))
  }

  const filteredOrders = useMemo(() => {
    const start = rangeStart ? new Date(rangeStart) : null
    const end = rangeEnd ? new Date(rangeEnd) : null
    const s = start ? start.getTime() : null
    const e = end ? end.getTime() : null

    return orders
      .filter((order) => {
        if (statusFilter !== 'all' && (order.status || 'pending') !== statusFilter) return false
        if (s == null || e == null) return true
        const t = new Date(order.createdAt || 0).getTime()
        return t >= s && t <= e
      })
      .sort((a, b) => {
        if (sortKey === 'createdAt_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        if (sortKey === 'total_desc') return (Number(b.total) || 0) - (Number(a.total) || 0)
        if (sortKey === 'total_asc') return (Number(a.total) || 0) - (Number(b.total) || 0)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [orders, statusFilter, sortKey, rangeStart, rangeEnd])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const page = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize)

  const exportCSV = () => {
    const rows = filteredOrders.map((o) => ({
      orderId: o.orderId || '',
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
      status: o.status || 'pending',
      customerName: o.customer?.name || '',
      phone: o.customer?.phone || '',
      itemsCount: o.items?.length ?? 0,
      total: o.total ?? 0,
      paymentMethod: o.paymentMethod || 'cod',
      paymentStatus: o.paymentStatus ?? ''
    }))

    if (rows.length === 0) return

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = Object.keys(rows[0]).join(',')
    const body = rows.map((r) => Object.values(r).map(escape).join(',')).join('\n')
    const csv = `${header}\n${body}`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="container">
          <div className="admin-loading">Đang tải đơn hàng...</div>
          <div className="admin-table-skeleton">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div className="admin-skeleton-row" key={idx}>
                {Array.from({ length: 7 }).map((__, i) => (
                  <div className="admin-skeleton-cell" key={i} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !user || user.role !== 'admin') return null

  return (
    <AdminLayout title="Quản lý đơn hàng" subtitle="Theo dõi trạng thái đơn và xử lý nhanh theo mã đơn">
      <div className="admin-orders-page">
        <div className="admin-header">
          <h2>Danh sách đơn hàng</h2>
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
            <select
              className="admin-order-search-input"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipped">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select
              className="admin-order-search-input"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="createdAt_desc">Mới nhất</option>
              <option value="createdAt_asc">Cũ nhất</option>
              <option value="total_desc">Giá trị cao nhất</option>
              <option value="total_asc">Giá trị thấp nhất</option>
            </select>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsRangeModalOpen(true)}
            >
              {rangeStart && rangeEnd ? `${formatVNDate(rangeStart)} - ${formatVNDate(rangeEnd)}` : 'Chọn ngày'}
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={exportCSV}
              disabled={filteredOrders.length === 0}
            >
              <FiDownload /> Xuất CSV
            </button>
          </div>
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
                    onClick={() => handleQuickDays(d)}
                  >
                    {d} Ngày
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="admin-date-confirm-btn"
                onClick={() => setIsRangeModalOpen(false)}
              >
                Chọn ngày
              </button>
            </div>
          </div>
        )}

        {filteredOrders.length === 0 ? (
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
                {paginatedOrders.map((order) => (
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
                        : order.paymentMethod === 'payos'
                          ? 'PayOS'
                          : order.paymentMethod || 'COD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-pagination">
              <span>Trang {page}/{totalPages}</span>
              <div className="admin-pagination-actions">
                <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  Trước
                </button>
                <button type="button" className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminOrders
