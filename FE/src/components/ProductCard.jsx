import React from 'react'
import { Link } from 'react-router-dom'
import { FiShoppingCart, FiHeart } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import './ProductCard.css'

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product, 1)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-link">
        <div className="product-image-wrapper">
          <img
            src={product.image || (product.images && product.images[0]) || 'https://via.placeholder.com/400x400?text=No+Image'}
            alt={product.name}
            className="product-image"
          />
          {product.sale && <span className="sale-badge">Sale</span>}
          <button className="wishlist-btn" aria-label="Thêm vào yêu thích">
            <FiHeart />
          </button>
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-brand">{product.brand}</p>
          <div className="product-price">
            {product.originalPrice && (
              <span className="original-price">{formatPrice(product.originalPrice)}</span>
            )}
            <span className="current-price">{formatPrice(product.price)}</span>
          </div>
          <div className="product-rating">
            <div className="stars">
              {'★'.repeat(Math.floor(product.rating || 5))}
              {'☆'.repeat(5 - Math.floor(product.rating || 5))}
            </div>
            <span className="rating-text">({product.reviews || 0})</span>
          </div>
        </div>
      </Link>
      <button className="add-to-cart-btn" onClick={handleAddToCart}>
        <FiShoppingCart />
        <span>Thêm vào giỏ</span>
      </button>
    </div>
  )
}

export default ProductCard
