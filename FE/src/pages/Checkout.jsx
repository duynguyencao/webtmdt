import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import VnAddressSelect from '../components/VnAddressSelect'
import './Checkout.css'

const CHECKOUT_PROFILE_KEY = 'checkout_profile_v1'

const Checkout = () => {
  const { cartItems, getTotalPrice, clearCart, appliedCoupon } = useCart()
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login?redirect=/checkout', { replace: true })
      return
    }
    setAuthChecked(true)
  }, [navigate])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    paymentMethod: 'cod',
    note: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [orderPaymentMethod, setOrderPaymentMethod] = useState('cod')
  const [orderTotal, setOrderTotal] = useState(0)
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [shippingQuote, setShippingQuote] = useState({ fee: 0, provider: 'manual' })

  // Prefill thông tin từ account + lần nhập gần nhất.
  useEffect(() => {
    if (!authChecked) return

    // Load từ localStorage (nếu có) trước để điền các trường giao hàng.
    try {
      const raw = localStorage.getItem(CHECKOUT_PROFILE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          setFormData((p) => ({
            ...p,
            name: p.name || saved.name || '',
            phone: p.phone || saved.phone || '',
            email: p.email || saved.email || '',
            address: p.address || saved.address || '',
            city: p.city || saved.city || '',
            district: p.district || saved.district || '',
            ward: p.ward || saved.ward || ''
          }))
        }
      }
    } catch {
      // ignore
    }

    // Load từ profile user (đảm bảo name/email đúng tài khoản).
    api.getMe()
      .then((u) => {
        setFormData((p) => ({
          ...p,
          name: p.name || u?.name || '',
          phone: p.phone || u?.phone || '',
          email: p.email || u?.email || '',
          address: p.address || u?.address?.line1 || '',
          ward: p.ward || u?.address?.ward || '',
          district: p.district || u?.address?.district || '',
          city: p.city || u?.address?.city || ''
        }))
      })
      .catch(() => {})
  }, [authChecked])

  const validators = {
    name: (v) => /^[\p{L}\s'.-]{2,}$/u.test(v.trim()) ? '' : 'Tên không hợp lệ',
    phone: (v) => /^(0|\+84)[0-9]{9,10}$/.test(v.replace(/\s+/g, '')) ? '' : 'Số điện thoại không hợp lệ',
    email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email không hợp lệ'
  }

  const handleChange = (e) => {
    const next = {
      ...formData,
      [e.target.name]: e.target.value
    }
    setFormData(next)
    if (validators[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: validators[e.target.name](e.target.value) }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cartItems.length) {
      setSubmitError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.')
      return
    }
    const nextErrors = Object.fromEntries(
      Object.entries(validators)
        .map(([key, fn]) => [key, fn(formData[key] || '')])
        .filter(([, msg]) => msg)
    )
    if (Object.keys(nextErrors).length) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
      setSubmitError('Vui lòng nhập đúng định dạng thông tin giao hàng')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const shippingFee = Math.max(0, Number(shippingQuote?.fee) || 0)
      const total = Math.max(0, getTotalPrice() - (appliedCoupon?.discount || 0) + shippingFee)
      const res = await api.createOrder({
        customer: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: [formData.address, formData.ward, formData.district, formData.city].filter(Boolean).join(', ')
        },
        items: cartItems.map(({ id, sku, quantity, addOn }) => ({
          id: Number(id),
          sku: String(sku || '').trim() || undefined,
          quantity: Number(quantity) || 1,
          addOn: addOn || undefined
        })),
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod: formData.paymentMethod,
        note: formData.note
      })
      const totalAmount = total
      setOrderId(res.orderId)
      setOrderPaymentMethod(formData.paymentMethod || 'cod')
      setOrderTotal(totalAmount)
      setOrderPlaced(true)
      setPaymentUrl(res.paymentUrl || null)
      clearCart()

      // Lưu lại thông tin giao hàng để lần sau tự điền.
      try {
        localStorage.setItem(CHECKOUT_PROFILE_KEY, JSON.stringify({
          name: formData.name || '',
          phone: formData.phone || '',
          email: formData.email || '',
          address: formData.address || '',
          city: formData.city || '',
          district: formData.district || '',
          ward: formData.ward || ''
        }))
      } catch {
        // ignore
      }

      if (formData.paymentMethod === 'payos' && res.paymentUrl) {
        // Redirect sang PayOS để thanh toán
        window.location.href = res.paymentUrl
        return
      }
    } catch (err) {
      setSubmitError(err.message || 'Đặt hàng thất bại. Thử lại sau.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!authChecked) return
    if (!formData.city || !formData.district || !formData.ward) return
    api.getShippingQuote({
      city: formData.city,
      district: formData.district,
      ward: formData.ward,
      itemsCount: cartItems.length
    })
      .then((q) => setShippingQuote(q))
      .catch(() => setShippingQuote({ fee: 0, provider: 'manual' }))
  }, [authChecked, formData.city, formData.district, formData.ward, cartItems.length])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  useEffect(() => {
    // Không chạy logic redirect khi chưa kiểm tra auth xong,
    // tránh thay đổi thứ tự hook và gây điều hướng vòng lặp.
    if (!authChecked) return
    if (cartItems.length === 0 && !orderPlaced) navigate('/cart', { replace: true })
  }, [authChecked, cartItems.length, orderPlaced, navigate])

  if (!authChecked || (!api.getToken() && !orderPlaced)) return null

  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="order-success">
            <FiCheckCircle className="success-icon" />
            <h1>Đặt hàng thành công!</h1>
            <p>Cảm ơn bạn đã mua sắm tại ShopTD</p>
            <p className="order-info">
              Mã đơn hàng: <strong>#{orderId}</strong>
            </p>
            {orderPaymentMethod === 'payos' && (
              <div className="bank-transfer-instructions">
                <h3>Thanh toán qua PayOS</h3>
                <p>
                  Vui lòng hoàn tất thanh toán trên PayOS. Sau khi giao dịch thành công, hệ thống sẽ tự cập nhật trạng thái đơn.
                </p>
                {paymentUrl && (
                  <a className="btn btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
                    Mở PayOS để thanh toán
                  </a>
                )}
              </div>
            )}
            <p className="order-info">
              Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận đơn hàng.
            </p>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={() => navigate('/orders')}>
                Xem đơn hàng của tôi
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>
                Về trang chủ
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/products')}>
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 className="page-title">Thanh Toán</h1>
        <div className="checkout-layout">
          <div className="checkout-form-section">
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-section">
                <h2>Thông tin giao hàng</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Họ và tên *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.name && <small className="error-text">{fieldErrors.name}</small>}
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.phone && <small className="error-text">{fieldErrors.phone}</small>}
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {fieldErrors.email && <small className="error-text">{fieldErrors.email}</small>}
                  </div>
                  <div className="form-group full-width">
                    <label>Địa chỉ *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <VnAddressSelect
                    city={formData.city}
                    district={formData.district}
                    ward={formData.ward}
                    onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))}
                  />
                </div>
              </div>

              <div className="form-section">
                <h2>Phương thức thanh toán</h2>
                <div className="payment-methods">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleChange}
                    />
                    <div className="payment-info">
                      <strong>Thanh toán khi nhận hàng (COD)</strong>
                      <span>Thanh toán bằng tiền mặt khi nhận hàng</span>
                    </div>
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="payos"
                      checked={formData.paymentMethod === 'payos'}
                      onChange={handleChange}
                    />
                    <div className="payment-info">
                      <strong>Chuyển khoản qua PayOS</strong>
                      <span>Thanh toán tự động và hệ thống sẽ cập nhật khi thành công</span>
                    </div>
                  </label>
                </div>
                {formData.paymentMethod === 'payos' && (
                  <p className="bank-transfer-addinfo-hint">
                    Sau khi bấm <strong>Đặt hàng</strong>, bạn sẽ được chuyển sang PayOS để thanh toán ngay.
                  </p>
                )}
              </div>

              <div className="form-section form-section-note">
                <h2>Ghi chú đơn hàng</h2>
                <div className="note-input-wrapper">
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                    className="note-textarea"
                  />
                </div>
              </div>

              {submitError && <p className="error-text">{submitError}</p>}
              <button
                type="submit"
                className="btn btn-primary submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
              </button>
            </form>
          </div>

          <div className="checkout-summary">
            <div className="summary-card">
              <h2>Đơn hàng của bạn</h2>
              <div className="order-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="order-item">
                    <img src={item.image} alt={item.name} />
                    <div className="order-item-info">
                      <h4>{item.name}</h4>
                      <p>{item.brand}</p>
                      <span className="order-item-quantity">x{item.quantity}</span>
                    </div>
                    <div className="order-item-price">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row">
                <span>Tạm tính:</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="summary-row">
                <span>Phí ship:</span>
                <span>{formatPrice(Math.max(0, Number(shippingQuote?.fee) || 0))}</span>
              </div>
              {(appliedCoupon?.discount || 0) > 0 && (
                <div className="summary-row">
                  <span>Giảm giá ({appliedCoupon?.code}):</span>
                  <span>-{formatPrice(appliedCoupon.discount || 0)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Tổng cộng:</span>
                <span>{formatPrice(Math.max(0, getTotalPrice() - (appliedCoupon?.discount || 0) + (Number(shippingQuote?.fee) || 0)))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
