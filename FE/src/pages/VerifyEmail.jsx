import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import './Auth.css'

const VerifyEmail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      if (!token) {
        setError('Thiếu token xác thực email')
        setLoading(false)
        return
      }

      try {
        const res = await api.verifyEmail(token)
        // Auto login sau khi xác thực thành công.
        api.setToken(res.token)
        if (isMounted) navigate('/', { replace: true })
      } catch (err) {
        if (isMounted) setError(err.message || 'Xác thực email thất bại')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    run()

    return () => {
      isMounted = false
    }
  }, [token, navigate])

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-card">
          <h1 className="auth-title">Xác thực email</h1>
          <p className="auth-subtitle">Vui lòng chờ trong giây lát...</p>

          {loading && <p className="auth-error" style={{ color: '#334155' }}>Đang xác thực...</p>}
          {error && <p className="auth-error">{error}</p>}

          {!loading && !error && (
            <p className="auth-footer">
              Nếu chưa tự động đăng nhập, bạn có thể <Link to="/login">đăng nhập</Link> thủ công.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail

