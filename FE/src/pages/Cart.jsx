import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import './Cart.css'

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice } = useCart()
  const navigate = useNavigate()

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
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
              {getTotalPrice() < 500000 && (
                <p className="shipping-note">
                  Mua thêm {formatPrice(500000 - getTotalPrice())} để được miễn phí vận chuyển
                </p>
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
              <div className="promo-input">
                <input type="text" placeholder="Nhập mã giảm giá" />
                <button className="btn btn-outline">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
