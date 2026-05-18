import React from 'react'
import { Link } from 'react-router-dom'
import { FiShoppingCart } from 'react-icons/fi'
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

  const stock = Number(product?.stock ?? 0) || 0
  const outOfStock = stock <= 0 || product?.inStock === false
  const discountPercent = product?.originalPrice
    ? Math.round((1 - (Number(product.price) || 0) / Number(product.originalPrice) || 1) * 100)
    : 0

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-link">
        <div className="product-image-wrapper">
          <img
            src={product.image || (product.images && product.images[0]) || 'https://via.placeholder.com/400x400?text=No+Image'}
            alt={product.name}
            className="product-image"
          />
          {product.sale && discountPercent > 0 && (
            <span className="sale-badge">{`-${discountPercent}%`}</span>
          )}
          {outOfStock && <span className="out-stock-badge">Hết hàng</span>}
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-brand">{product.brand}</p>
          <div className="product-price">
            <span className={`original-price ${product.originalPrice ? '' : 'is-placeholder'}`}>
              {product.originalPrice ? formatPrice(product.originalPrice) : formatPrice(product.price)}
            </span>
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
      <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={outOfStock} aria-disabled={outOfStock}>
        <FiShoppingCart />
        <span>{outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
      </button>
    </div>
  )
}

export default ProductCard
