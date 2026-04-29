import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { api } from '../api/client'
import './Cart.css'

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart, appliedCoupon, setAppliedCoupon } = useCart()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = React.useState('')
  const [couponError, setCouponError] = React.useState('')
  const [couponLoading, setCouponLoading] = React.useState(false)

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  const discount = appliedCoupon?.discount || 0
  const finalTotal = Math.max(0, getTotalPrice() - discount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Vui lòng nhập mã giảm giá')
      return
    }
    setCouponLoading(true)
    setCouponError('')
    try {
      const result = await api.validateCoupon(couponCode.trim(), getTotalPrice())
      setAppliedCoupon(result)
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(err.message || 'Không áp dụng được mã giảm giá')
    } finally {
      setCouponLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-cart">
            <FiShoppingBag className="empty-icon" />
            <h2>Giỏ hàng của bạn đang trống</h2>
            <p>Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
            <Link to="/products" className="btn btn-primary">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="page-title">Giỏ Hàng</h1>
        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-header">
              <h2>Sản phẩm ({cartItems.length})</h2>
              <button
                type="button"
                className="clear-all-btn"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) clearCart()
                }}
              >
                Xóa tất cả
              </button>
            </div>
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <Link to={`/products/${item.id}`} className="cart-item-image">
                  <img src={item.image} alt={item.name} />
                </Link>
                <div className="cart-item-info">
                  <Link to={`/products/${item.id}`}>
                    <h3 className="cart-item-name">{item.name}</h3>
                  </Link>
                  <p className="cart-item-brand">{item.brand}</p>
                  <div className="cart-item-price">
                    {formatPrice(item.price)}
                  </div>
                </div>
                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <FiMinus />
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <FiPlus />
                    </button>
                  </div>
                  <div className="cart-item-total">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Xóa sản phẩm"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h2>Tóm tắt đơn hàng</h2>
              <div className="summary-row">
                <span>Tạm tính:</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="summary-row">
                <span>Tổng cộng:</span>
                <span>
                  {formatPrice(finalTotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="summary-row">
                  <span>Giảm giá ({appliedCoupon?.code}):</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <button
                className="btn btn-primary checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                Thanh toán
              </button>
              <Link to="/products" className="continue-shopping">
                Tiếp tục mua sắm
              </Link>
            </div>

            <div className="promo-card">
              <h3>Mã giảm giá</h3>
              {appliedCoupon && <p className="coupon-success">Đã áp dụng mã {appliedCoupon.code}</p>}
              {couponError && <p className="coupon-error">{couponError}</p>}
              <div className="promo-input">
                <input type="text" placeholder="Nhập mã giảm giá" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                <button className="btn btn-outline" type="button" onClick={handleApplyCoupon} disabled={couponLoading}>
                  {couponLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              </div>
              {appliedCoupon && (
                <button className="btn btn-outline" type="button" onClick={() => setAppliedCoupon(null)} style={{ marginTop: '0.75rem' }}>
                  Gỡ mã
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
