import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

const CartContext = createContext()

const CART_STORAGE_KEY = 'cart'

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const toastTimeoutRef = useRef(null)
  const lastSyncedRef = useRef(null)
  const syncTimerRef = useRef(null)

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      setCartItems(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  // Nếu đã đăng nhập => load cart từ DB để đồng bộ nhiều thiết bị.
  useEffect(() => {
    const token = api.getToken()
    if (!token) return
    api.getCart()
      .then((res) => {
        const items = Array.isArray(res?.items) ? res.items : []
        setCartItems(items)
        lastSyncedRef.current = JSON.stringify(items)
      })
      .catch(() => {})
  }, [])

  // Sync cart lên DB (debounce) khi đã đăng nhập
  useEffect(() => {
    const token = api.getToken()
    if (!token) return

    const payload = cartItems.map((it) => ({
      productId: Number(it.id),
      quantity: Math.max(1, Number(it.quantity) || 1),
    }))
    const json = JSON.stringify(payload)
    if (lastSyncedRef.current === json) return

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      api.updateCart(payload)
        .then((res) => {
          const items = Array.isArray(res?.items) ? res.items : null
          if (items) {
            setCartItems(items)
            lastSyncedRef.current = JSON.stringify(payload)
          } else {
            lastSyncedRef.current = json
          }
        })
        .catch(() => {})
    }, 400)

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [cartItems])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id)
      if (existingItem) {
        return prevItems.map(item =>
          (item.id === product.id)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prevItems, { ...product, quantity }]
    })
    setToastMessage(`Da them ${quantity} x ${product.name} vao gio hang`)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 2000)
  }

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCartItems(prevItems =>
      prevItems.map(item => {
        const isMatch = item.id === productId

        if (!isMatch) return item

        const stock = Number(item?.stock)
        const safeQty = Number.isFinite(stock) && stock >= 0 ? Math.min(quantity, Math.max(1, stock)) : quantity
        return { ...item, quantity: safeQty }
      })
    )
  }

  const clearCart = () => {
    setCartItems([])
    setAppliedCoupon(null)
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        toastMessage,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setAppliedCoupon,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
