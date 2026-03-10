import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import BankTransferInfo from '../components/BankTransferInfo'
import './Checkout.css'

const Checkout = () => {
  const { cartItems, getTotalPrice, clearCart } = useCart()
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
  const [submitError, setSubmitError] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cartItems.length) {
      setSubmitError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const total = getTotalPrice() + (getTotalPrice() >= 500000 ? 0 : 30000)
      const res = await api.createOrder({
        customer: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: [formData.address, formData.ward, formData.district, formData.city].filter(Boolean).join(', ')
        },
        items: cartItems.map(({ id, name, brand, image, price, quantity }) => ({
          id: Number(id),
          name,
          brand,
          image: image || '',
          price: Number(price),
          quantity: Number(quantity) || 1
        })),
        total,
        paymentMethod: (formData.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cod'),
        note: formData.note
      })
      const totalAmount = getTotalPrice() + (getTotalPrice() >= 500000 ? 0 : 30000)
      setOrderId(res.orderId)
      setOrderPaymentMethod(formData.paymentMethod || 'cod')
      setOrderTotal(totalAmount)
      setOrderPlaced(true)
      clearCart()
    } catch (err) {
      setSubmitError(err.message || 'Đặt hàng thất bại. Thử lại sau.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  if (!authChecked || (!api.getToken() && !orderPlaced)) return null
  if (cartItems.length === 0 && !orderPlaced) {
    navigate('/cart')
    return null
  }

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
            {orderPaymentMethod === 'bank_transfer' && (
              <div className="bank-transfer-instructions">
                <h3>Thông tin chuyển khoản</h3>
                <p>Vui lòng dùng ứng dụng ngân hàng để quét mã QR bên dưới hoặc chuyển khoản theo thông tin tài khoản.</p>
                <BankTransferInfo orderId={orderId} amount={orderTotal} />
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
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
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
                  <div className="form-group">
                    <label>Tỉnh/Thành phố *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Quận/Huyện *</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phường/Xã *</label>
                    <input
                      type="text"
                      name="ward"
                      value={formData.ward}
                      onChange={handleChange}
                      required
                    />
                  </div>
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
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleChange}
                    />
                    <div className="payment-info">
                      <strong>Chuyển khoản qua ngân hàng (QR)</strong>
                      <span>Quét QR hoặc chuyển khoản theo thông tin tài khoản của shop</span>
                    </div>
                  </label>
                </div>
                {formData.paymentMethod === 'bank_transfer' && (
                  <p className="bank-transfer-addinfo-hint">
                    Sau khi bấm <strong>Đặt hàng</strong>, màn hình xác nhận sẽ hiển thị thông tin tài khoản và mã đơn để bạn chuyển khoản.
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
                <span>Phí vận chuyển:</span>
                <span className="free-shipping">
                  {getTotalPrice() >= 500000 ? 'Miễn phí' : formatPrice(30000)}
                </span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Tổng cộng:</span>
                <span>
                  {formatPrice(getTotalPrice() + (getTotalPrice() >= 500000 ? 0 : 30000))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
