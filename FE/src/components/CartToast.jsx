import React from 'react'
import { useCart } from '../context/CartContext'
import './CartToast.css'

const CartToast = () => {
  const { toastMessage } = useCart()

  if (!toastMessage) return null

  return (
    <div className="cart-toast" role="status" aria-live="polite">
      {toastMessage}
    </div>
  )
}

export default CartToast
