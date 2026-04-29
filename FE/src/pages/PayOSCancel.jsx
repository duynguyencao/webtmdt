import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

const PayOSCancel = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)

  useEffect(() => {
    const sp = new URLSearchParams(location.search || '')
    const orderId = String(sp.get('orderId') || '').trim()
    if (!orderId) {
      navigate('/orders', { replace: true })
      return
    }
    if (!api.getToken()) {
      navigate(`/login?redirect=${encodeURIComponent(`/payos/cancel?orderId=${orderId}`)}`, { replace: true })
      return
    }

    api.cancelPayOSAndDeleteOrder(orderId)
      .then(() => navigate('/orders', { replace: true }))
      .catch((err) => {
        setError(err.message || 'Không thể hủy thanh toán PayOS')
      })
  }, [location.search, navigate])

  return (
    <div style={{ padding: '2rem 0', minHeight: '60vh' }}>
      <div className="container">
        <h1 style={{ marginBottom: 8 }}>Đang hủy thanh toán...</h1>
        <p style={{ opacity: 0.85 }}>
          Vui lòng chờ trong giây lát, hệ thống đang hủy đơn PayOS và hoàn kho.
        </p>
        {error && (
          <>
            <p className="auth-error">{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>
              Về đơn hàng của tôi
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default PayOSCancel

