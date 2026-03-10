import React from 'react'
import { Link } from 'react-router-dom'
import './CategoryCard.css'

const CategoryCard = ({ category }) => {
  return (
    <Link to={category.path} className="category-card">
      <div className="category-image-wrapper">
        <img src={category.image} alt={category.name} className="category-image" />
        <div className="category-overlay">
          <h3 className="category-name">{category.name}</h3>
          {/* <span className="category-count">{category.count} sản phẩm</span> */}
        </div>
      </div>
    </Link>
  )
}

export default CategoryCard
