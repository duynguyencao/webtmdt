import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AdminLayout from '../components/AdminLayout'
import './AdminDashboard.css'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import viLocale from 'date-fns/locale/vi'

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)

const QUICK_DAYS = [7, 15, 30]

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const inRange = (date, start, end) => {
  const d = new Date(date || 0)
  return d >= start && d <= end
}

const formatVNDate = (date) => {
  if (!date) return ''
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatVNMonth = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
const formatVNDy = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

const getGroupByByDurationDays = (durationDays) => {
  if (durationDays <= 31) return 'day'
  if (durationDays <= 90) return 'week'
  return 'month'
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState([])
  const [couponMode, setCouponMode] = useState('create') // 'create' | 'edit'
  const [editingCouponCode, setEditingCouponCode] = useState(null)
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percent',
    value: 10,
    minOrderTotal: 0,
    maxDiscount: 0,
    usageLimit: 0,
    active: true
  })
  const [couponError, setCouponError] = useState('')
  const [siteConfig, setSiteConfig] = useState({ heroTitle: '', heroSubtitle: '', heroImage: '', saleTitle: '', productGridCols: 4 })
  const [rangeStart, setRangeStart] = useState(() => startOfDay(addDays(new Date(), -29)))
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(startOfDay(new Date())))
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false)
  const [couponBusy, setCouponBusy] = useState(false)

  useEffect(() => {
    api.getMe()
      .then((u) => {
        setUser(u)
        if (u.role !== 'admin') {
          navigate('/', { replace: true })
          return
        }
        return Promise.all([api.getProducts(), api.getOrders(), api.getCoupons(), api.getSiteConfig()])
      })
      .then((res) => {
        if (!res) return
        setProducts(res[0] || [])
        setOrders(res[1] || [])
        setCoupons(res[2] || [])
        setSiteConfig((res[3] || {}))
      })
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setLoading(false))
  }, [navigate])

  const { currentOrders, previousOrders, rangeLabel, groupBy, durationDays } = useMemo(() => {
    const safeStart = rangeStart || startOfDay(addDays(new Date(), -29))
    const safeEnd = rangeEnd || endOfDay(safeStart)
    const startMs = safeStart.getTime()
    const endMs = safeEnd.getTime()
    const diffMs = Math.max(0, endMs - startMs)
    const days = Math.max(1, Math.round(diffMs / 86400000) + 1)
    const prevStart = new Date(startMs - days * 86400000)
    const prevEnd = new Date(endMs - days * 86400000)
    const nextGroupBy = getGroupByByDurationDays(days)
    return {
      currentOrders: orders.filter((o) => inRange(o.createdAt, safeStart, safeEnd)),
      previousOrders: orders.filter((o) => inRange(o.createdAt, prevStart, prevEnd)),
      rangeLabel: `${formatVNDate(safeStart)} - ${formatVNDate(safeEnd)}`,
      groupBy: nextGroupBy,
      durationDays: days
    }
  }, [orders, rangeStart, rangeEnd])

  // Đơn "đã bán" cho thống kê doanh thu / top sản phẩm:
  // - Không tính `cancelled`
  // - Chỉ tính các trạng thái đã chốt (confirmed/shipped/delivered)
  // - Với PayOS: chỉ khi `paymentStatus === 'paid'`
  const isSaleOrder = (order) => {
    const status = order?.status || 'pending'
    if (status === 'cancelled') return false
    if (!['confirmed', 'shipped', 'delivered'].includes(status)) return false
    const pm = String(order?.paymentMethod || '').toLowerCase()
    if (pm === 'payos') return order?.paymentStatus === 'paid'
    // COD: khi đã confirmed nghĩa là đã thanh toán (admin xác nhận)
    return true
  }

  const saleCurrentOrders = useMemo(() => currentOrders.filter(isSaleOrder), [currentOrders])
  const salePreviousOrders = useMemo(() => previousOrders.filter(isSaleOrder), [previousOrders])

  const metrics = useMemo(() => {
    const revenue = saleCurrentOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const pendingOrders = currentOrders.filter((o) => o.status === 'pending').length
    const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    const orderCount = saleCurrentOrders.length
    const avgOrderValue = orderCount ? revenue / orderCount : 0
    const previousRevenue = salePreviousOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const previousCount = salePreviousOrders.length
    const previousAov = previousCount ? previousRevenue / previousCount : 0
    const changePct = (current, previous) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0)
    return {
      revenue,
      pendingOrders,
      outOfStock,
      totalStock,
      orderCount,
      avgOrderValue,
      revenueDelta: changePct(revenue, previousRevenue),
      orderDelta: changePct(orderCount, previousCount),
      aovDelta: changePct(avgOrderValue, previousAov)
    }
  }, [currentOrders, previousOrders, saleCurrentOrders, salePreviousOrders, products])

  const statusChartData = useMemo(() => {
    const labels = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    return labels.map((key) => ({
      key,
      label: STATUS_LABELS[key] || key,
      count: currentOrders.filter((o) => o.status === key).length
    }))
  }, [currentOrders])

  const handleQuickDays = (days) => {
    const todayStart = startOfDay(new Date())
    setRangeStart(startOfDay(addDays(todayStart, -(days - 1))))
    setRangeEnd(endOfDay(todayStart))
  }

  const revenueOverTime = useMemo(() => {
    const group = saleCurrentOrders.reduce((acc, order) => {
      const d = new Date(order.createdAt || Date.now())
      let key = ''
      let label = ''

      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        label = formatVNDy(d)
      } else if (groupBy === 'week') {
        // Thứ 2 là bắt đầu tuần
        const day = d.getDay() // 0..6 (CN..T7)
        const diffToMonday = (day + 6) % 7
        const monday = addDays(d, -diffToMonday)
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
        label = `Tuần ${formatVNDy(monday)}`
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        label = formatVNMonth(d)
      }

      if (!acc[key]) acc[key] = { label, revenue: 0 }
      acc[key].revenue += (Number(order.total) || 0)
      return acc
    }, {})

    return Object.entries(group)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => ({ key, label: v.label, revenue: v.revenue }))
  }, [saleCurrentOrders, groupBy])

  const topProducts = useMemo(() => {
    const curMap = new Map()
    const prevMap = new Map()

    const accumulate = (ordersList, map) => {
      ordersList.forEach((order) => {
        ;(order.items || []).forEach((item) => {
          const key = String(item.id ?? item.name)
          const prev = map.get(key) || { name: item.name, units: 0 }
          prev.units += Number(item.quantity) || 0
          map.set(key, prev)
        })
      })
    }

    accumulate(saleCurrentOrders, curMap)
    accumulate(salePreviousOrders, prevMap)

    return [...curMap.entries()]
      .map(([key, cur]) => {
        const prev = prevMap.get(key) || { units: 0 }
        const units = cur.units || 0
        const unitsPrev = prev.units || 0
        const deltaPct = unitsPrev > 0 ? ((units - unitsPrev) / unitsPrev) * 100 : null
        return { name: cur.name, units, unitsPrev, deltaPct }
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
  }, [saleCurrentOrders, salePreviousOrders])

  const recentOrders = useMemo(
    () => [...currentOrders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6),
    [currentOrders]
  )

  const submitCoupon = async (e) => {
    e.preventDefault()
    setCouponError('')
    setCouponBusy(true)
    try {
      if (couponMode === 'create') {
        await api.createCoupon(couponForm)
      } else {
        await api.updateCoupon(editingCouponCode, {
          type: couponForm.type,
          value: couponForm.value,
          minOrderTotal: couponForm.minOrderTotal,
          maxDiscount: couponForm.maxDiscount,
          usageLimit: couponForm.usageLimit,
          active: couponForm.active
        })
      }
      const next = await api.getCoupons()
      setCoupons(next)
      setCouponMode('create')
      setEditingCouponCode(null)
      setCouponForm({ code: '', type: 'percent', value: 10, minOrderTotal: 0, maxDiscount: 0, usageLimit: 0, active: true })
    } catch (err) {
      setCouponError(err.message || (couponMode === 'edit' ? 'Không cập nhật được mã giảm giá' : 'Không tạo được mã giảm giá'))
    } finally {
      setCouponBusy(false)
    }
  }

  const handleEditCoupon = (coupon) => {
    setCouponError('')
    setCouponMode('edit')
    setEditingCouponCode(coupon.code)
    setCouponForm({
      code: coupon.code,
      type: coupon.type || 'percent',
      value: Number(coupon.value) || 0,
      minOrderTotal: Number(coupon.minOrderTotal) || 0,
      maxDiscount: Number(coupon.maxDiscount) || 0,
      usageLimit: Number(coupon.usageLimit) || 0,
      active: coupon.active !== false
    })
  }

  const handleCancelEditCoupon = () => {
    setCouponError('')
    setCouponMode('create')
    setEditingCouponCode(null)
    setCouponForm({ code: '', type: 'percent', value: 10, minOrderTotal: 0, maxDiscount: 0, usageLimit: 0, active: true })
  }

  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa mã giảm giá "${coupon.code}"?`)) return
    setCouponError('')
    setCouponBusy(true)
    try {
      await api.deleteCoupon(coupon.code)
      const next = await api.getCoupons()
      setCoupons(next)
      if (couponMode === 'edit' && editingCouponCode === coupon.code) handleCancelEditCoupon()
    } catch (err) {
      setCouponError(err.message || 'Không xóa được mã giảm giá')
    } finally {
      setCouponBusy(false)
    }
  }

  const saveSiteConfig = async (e) => {
    e.preventDefault()
    await api.updateSiteConfig(siteConfig)
  }

  if (loading) return <div className="admin-loading">Đang tải thống kê...</div>
  if (!user || user.role !== 'admin') return null

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Tổng quan hoạt động cửa hàng theo thời gian thực">
      <div className="admin-dashboard-page">
        <div className="admin-toolbar-card">
          <div className="admin-range-display">
            <div className="admin-range-item">
              <span>Từ ngày</span>
              <strong>{formatVNDate(rangeStart)}</strong>
            </div>
            <div className="admin-range-item">
              <span>Đến ngày</span>
              <strong>{formatVNDate(rangeEnd)}</strong>
            </div>
          </div>

          <div className="admin-toolbar-controls">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsRangeModalOpen(true)}
            >
              Chọn ngày
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
                <button type="button" className="admin-date-modal-close" onClick={() => setIsRangeModalOpen(false)} aria-label="Đóng">
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
                    // Khi người dùng mới chọn lần 1 thì end vẫn chưa có => để null để cho họ chọn tiếp.
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

              <button type="button" className="admin-date-confirm-btn" onClick={() => setIsRangeModalOpen(false)}>
                Chọn ngày
              </button>
            </div>
          </div>
        )}

        <div className="admin-metrics-grid">
          <div className="admin-metric-card"><span>Tổng sản phẩm</span><strong>{products.length}</strong><small>Tồn kho: {metrics.totalStock}</small></div>
          <div className="admin-metric-card"><span>Doanh thu</span><strong>{formatPrice(metrics.revenue)}</strong><small className={metrics.revenueDelta >= 0 ? 'positive' : 'negative'}>{metrics.revenueDelta >= 0 ? '+' : ''}{metrics.revenueDelta}% so với kỳ trước</small></div>
          <div className="admin-metric-card"><span>Đơn hàng</span><strong>{metrics.orderCount}</strong><small className={metrics.orderDelta >= 0 ? 'positive' : 'negative'}>{metrics.orderDelta >= 0 ? '+' : ''}{metrics.orderDelta}% so với kỳ trước</small></div>
          <div className="admin-metric-card"><span>Giá trị đơn TB</span><strong>{formatPrice(metrics.avgOrderValue)}</strong><small className={metrics.aovDelta >= 0 ? 'positive' : 'negative'}>{metrics.aovDelta >= 0 ? '+' : ''}{metrics.aovDelta}% so với kỳ trước</small></div>
          <div className="admin-metric-card danger"><span>Sản phẩm hết hàng</span><strong>{metrics.outOfStock}</strong><small>{metrics.pendingOrders} đơn đang chờ xử lý</small></div>
        </div>

        <div className="admin-chart-grid">
          <div className="admin-chart-card admin-span-2">
            <h3>Doanh thu theo thời gian</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart
                  data={revenueOverTime.map((p) => ({ label: p.label, revenue: p.revenue }))}
                  margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(v) => formatPrice(v)}
                    labelFormatter={(l) => l}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-card">
            <h3>Đơn hàng theo trạng thái</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, bottom: 10, left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => v} />
                  <Bar dataKey="count" fill="#0ea5e9" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-card">
            <h3>Top sản phẩm theo số lượng bán</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={topProducts.map((p) => ({ label: p.name, units: p.units, deltaPct: p.deltaPct }))}
                  layout="vertical"
                  margin={{ top: 10, right: 20, bottom: 10, left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const p = payload[0].payload
                      const delta = p.deltaPct
                      const deltaText = delta == null
                        ? '—'
                        : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`
                      return (
                        <div style={{ background: '#0f172a', color: '#fff', padding: 12, borderRadius: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.label}</div>
                          <div>Số lượng: <strong>{p.units}</strong></div>
                          <div>So với kỳ trước: <strong>{deltaText}</strong></div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="units" fill="#3b82f6" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="admin-chart-card">
          <h3>Đơn hàng gần đây</h3>
          <div className="admin-recent-orders">
            {recentOrders.map((order) => (
              <button key={order.orderId} type="button" className="admin-recent-order-item" onClick={() => navigate(`/admin/orders/${order.orderId}`)}>
                <div>
                  <strong>{order.orderId}</strong>
                  <p>{order.customer?.name || 'Khách lẻ'}</p>
                </div>
                <div>
                  <span className={`admin-order-mini-status admin-order-mini-status-${order.status || 'pending'}`}>{STATUS_LABELS[order.status] || STATUS_LABELS.pending}</span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-chart-grid" style={{ marginTop: '1rem' }}>
          <div className="admin-chart-card">
            <div className="admin-section-title">
              <h3>Tùy chỉnh giao diện trang chủ</h3>
              <p className="admin-section-subtitle">Cập nhật nhanh nội dung hiển thị ở trang chủ (hero, banner sale, số cột lưới sản phẩm).</p>
            </div>

            <form onSubmit={saveSiteConfig} className="admin-form">
              <div className="admin-form-group">
                <label className="admin-field-label">Tiêu đề hero</label>
                <input
                  placeholder="Ví dụ: Cửa Hàng Cầu Lông Chuyên Nghiệp"
                  value={siteConfig.heroTitle || ''}
                  onChange={(e) => setSiteConfig((p) => ({ ...p, heroTitle: e.target.value }))}
                />
                <div className="admin-field-help">Hiển thị dòng tiêu đề lớn ở phần đầu trang chủ.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">Mô tả hero</label>
                <textarea
                  placeholder="Ví dụ: Hơn 50 chi nhánh... Sản phẩm chính hãng..."
                  value={siteConfig.heroSubtitle || ''}
                  onChange={(e) => setSiteConfig((p) => ({ ...p, heroSubtitle: e.target.value }))}
                  rows={2}
                />
                <div className="admin-field-help">Dòng mô tả phụ nằm ngay dưới tiêu đề hero.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">URL banner hero</label>
                <input
                  placeholder="https://.../anh-hero.jpg"
                  value={siteConfig.heroImage || ''}
                  onChange={(e) => setSiteConfig((p) => ({ ...p, heroImage: e.target.value }))}
                />
                <div className="admin-field-help">Nhập URL ảnh để thay banner hero. Để trống nếu không đổi.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">Tiêu đề banner sale</label>
                <input
                  placeholder="Ví dụ: Sale Off Lên Đến 50%"
                  value={siteConfig.saleTitle || ''}
                  onChange={(e) => setSiteConfig((p) => ({ ...p, saleTitle: e.target.value }))}
                />
                <div className="admin-field-help">Hiển thị tiêu đề ở banner khuyến mãi trên trang chủ.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">Số cột lưới sản phẩm</label>
                <input
                  type="number"
                  min="2"
                  max="6"
                  step="1"
                  value={siteConfig.productGridCols || 4}
                  onChange={(e) => setSiteConfig((p) => ({ ...p, productGridCols: Number(e.target.value) || 4 }))}
                />
                <div className="admin-field-help">Chọn từ 2 đến 6 cột để tối ưu hiển thị theo màn hình.</div>
              </div>

              <button type="submit" className="btn btn-primary admin-primary-btn">Lưu giao diện trang chủ</button>
            </form>
          </div>

          <div className="admin-chart-card">
            <div className="admin-section-title">
              <h3>Tạo mã giảm giá tùy chỉnh</h3>
              <p className="admin-section-subtitle">Tạo mã để áp dụng ở trang giỏ hàng/checkout. Mã chỉ hợp lệ khi thỏa điều kiện thời gian và đơn tối thiểu.</p>
            </div>

            {couponError && <p className="admin-error">{couponError}</p>}

            <form onSubmit={submitCoupon} className="admin-form">
              {couponMode === 'edit' && (
                <div className="admin-form-group">
                  <div className="admin-field-help">
                    Đang chỉnh sửa: <strong>{editingCouponCode}</strong>
                  </div>
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-field-label">Mã giảm giá</label>
                <input
                  placeholder="VD: SALE10"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required={couponMode === 'create'}
                  disabled={couponMode === 'edit'}
                />
                <div className="admin-field-help">Mã sẽ được tự động viết hoa. Dùng đúng mã này để áp dụng coupon.</div>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-field-label">Kiểu giảm</label>
                  <select value={couponForm.type} onChange={(e) => setCouponForm((p) => ({ ...p, type: e.target.value }))}>
                    <option value="percent">Giảm theo %</option>
                    <option value="fixed">Giảm số tiền cố định</option>
                  </select>
                  <div className="admin-field-help">Chọn % hoặc số tiền cố định.</div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-field-label">Giá trị giảm</label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.value}
                    onChange={(e) => setCouponForm((p) => ({ ...p, value: Number(e.target.value) || 0 }))}
                    required
                  />
                  <div className="admin-field-help">
                    {couponForm.type === 'percent' ? 'Ví dụ: 10 = giảm 10%.' : 'Ví dụ: 50000 = giảm 50.000đ.'}
                  </div>
                </div>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-field-label">Đơn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.minOrderTotal}
                    onChange={(e) => setCouponForm((p) => ({ ...p, minOrderTotal: Number(e.target.value) || 0 }))}
                  />
                  <div className="admin-field-help">Chỉ áp dụng khi Tạm tính đủ điều kiện này.</div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-field-label">Giảm tối đa</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm((p) => ({ ...p, maxDiscount: Number(e.target.value) || 0 }))}
                  />
                  <div className="admin-field-help">0 = không giới hạn mức giảm.</div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">Số lượt dùng</label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm((p) => ({ ...p, usageLimit: Number(e.target.value) || 0 }))}
                />
                <div className="admin-field-help">0 = không giới hạn lượt dùng.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-field-label">Trạng thái</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={couponForm.active}
                    onChange={(e) => setCouponForm((p) => ({ ...p, active: e.target.checked }))}
                  />
                  <span>Hoạt động</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary admin-primary-btn" disabled={couponBusy}>
                  {couponMode === 'edit' ? 'Cập nhật mã' : 'Tạo mã'}
                </button>
                {couponMode === 'edit' && (
                  <button type="button" className="btn btn-outline admin-primary-btn" disabled={couponBusy} onClick={handleCancelEditCoupon}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
          <div className="admin-chart-card">
            <h3>Danh sách mã giảm giá</h3>
            {coupons.map((c) => (
              <div key={c.code} className="admin-bar-row">
                <div className="admin-bar-label">{c.code}</div>
                <div className="admin-bar-value">
                  {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)} | Đã dùng: {c.usedCount || 0} | {c.active === false ? 'Tạm khóa' : 'Đang hoạt động'}
                </div>
                <div className="admin-coupon-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleEditCoupon(c)} disabled={couponBusy}>
                    Sửa
                  </button>
                  <button type="button" className="btn btn-outline btn-sm btn-danger" onClick={() => handleDeleteCoupon(c)} disabled={couponBusy}>
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
