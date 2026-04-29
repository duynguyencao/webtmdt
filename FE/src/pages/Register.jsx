import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import './Auth.css'

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const next = { ...formData, [e.target.name]: e.target.value }
    setFormData(next)
    if (e.target.name === 'name') {
      setFieldErrors((prev) => ({ ...prev, name: /^[\p{L}\s'.-]{2,}$/u.test(next.name.trim()) ? '' : 'Tên không hợp lệ' }))
    }
    if (e.target.name === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email) ? '' : 'Email không hợp lệ' }))
    }
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMessage(null)
    const nameOk = /^[\p{L}\s'.-]{2,}$/u.test(String(formData.name || '').trim())
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email || ''))
    if (!nameOk || !emailOk) {
      setError('Vui lòng nhập đúng định dạng họ tên và email')
      setFieldErrors((prev) => ({
        ...prev,
        name: nameOk ? '' : 'Tên không hợp lệ',
        email: emailOk ? '' : 'Email không hợp lệ'
      }))
      return
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.register(formData.name, formData.email, formData.password)
      setSuccessMessage(res.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.')
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-card">
          <h1 className="auth-title">Đăng ký</h1>
          <p className="auth-subtitle">Tạo tài khoản để mua sắm thuận tiện hơn</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <p className="auth-error">{error}</p>}
            {successMessage && <p className="auth-error" style={{ color: '#0f766e' }}>{successMessage}</p>}
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                required
              />
              {fieldErrors.name && <small className="auth-error">{fieldErrors.name}</small>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
              />
              {fieldErrors.email && <small className="auth-error">{fieldErrors.email}</small>}
            </div>
            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ít nhất 6 ký tự"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <p className="auth-footer">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>

          {successMessage && (
            <p className="auth-footer" style={{ marginTop: 10 }}>
              Sau khi xác nhận email, bạn có thể <Link to="/login">đăng nhập</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
