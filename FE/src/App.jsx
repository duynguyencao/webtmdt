import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ChatBot from './components/ChatBot'
import CartToast from './components/CartToast'
import ScrollToTop from './components/ScrollToTop'
import { api } from './api/client'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'
import AdminOrderDetail from './pages/AdminOrderDetail'
import AdminDashboard from './pages/AdminDashboard'
import MyOrders from './pages/MyOrders'
import MyOrderDetail from './pages/MyOrderDetail'
import ComingSoon from './pages/ComingSoon'
import Contact from './pages/Contact'
import Account from './pages/Account'
import Shipper from './pages/Shipper'
import PayOSCancel from './pages/PayOSCancel'
import SupportPage from './pages/SupportPage'
import { CartProvider } from './context/CartContext'

function App() {
  const [authUser, setAuthUser] = useState(undefined) // undefined = đang kiểm tra

  useEffect(() => {
    const loadMe = async () => {
      if (!api.getToken()) {
        setAuthUser(null)
        return
      }
      try {
        const u = await api.getMe()
        setAuthUser(u)
      } catch {
        api.logout()
        setAuthUser(null)
      }
    }
    loadMe()
  }, [])

  if (authUser === undefined) return null
  const isAdmin = authUser?.role === 'admin'
  const isShipper = authUser?.role === 'shipper'

  return (
    <CartProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <ScrollToTop />
          {!isAdmin && !isShipper && <Header user={authUser} />}
          <main>
            <Routes>
              {isAdmin ? (
                <>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
                  <Route path="/login" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </>
              ) : (
                <>
                  {isShipper ? (
                    <>
                      <Route path="/shipper" element={<Shipper />} />
                      <Route path="/login" element={<Navigate to="/shipper" replace />} />
                      <Route path="/" element={<Navigate to="/shipper" replace />} />
                      <Route path="*" element={<Navigate to="/shipper" replace />} />
                    </>
                  ) : (
                    <>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/orders" element={<MyOrders />} />
                  <Route path="/orders/:orderId" element={<MyOrderDetail />} />
                  <Route path="/payos/cancel" element={<PayOSCancel />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/track-order" element={<ComingSoon />} />
                  <Route path="/guide" element={<SupportPage type="guide" />} />
                  <Route path="/payment" element={<SupportPage type="payment" />} />
                  <Route path="/warranty" element={<SupportPage type="warranty" />} />
                  <Route path="/return" element={<SupportPage type="return" />} />
                  <Route path="/shipping" element={<SupportPage type="shipping" />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/admin/*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                </>
              )}
            </Routes>
          </main>
          {!isAdmin && !isShipper && <Footer />}
          {!isAdmin && !isShipper && <ChatBot />}
          <CartToast />
        </div>
      </Router>
    </CartProvider>
  )
}

export default App
