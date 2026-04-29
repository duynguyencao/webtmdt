import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import './Auth.css'
import './Account.css'

const Account = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [me, setMe] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    ward: '',
    district: '',
    city: ''
  })

  const validators = useMemo(() => ({
    name: (v) => /^[\p{L}\s'.-]{2,}$/u.test(String(v || '').trim()) ? '' : 'Tên không hợp lệ',
    phone: (v) => !v || /^(0|\+84)[0-9]{9,10}$/.test(String(v || '').replace(/\s+/g, '')) ? '' : 'Số điện thoại không hợp lệ',
    email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')) ? '' : 'Email không hợp lệ'
  }), [])

  const [fieldErrors, setFieldErrors] = useState({})

  const loadMe = async () => {
    const u = await api.getMe()
    setMe(u)
    setForm({
      name: u?.name || '',
      email: u?.email || '',
      phone: u?.phone || '',
      addressLine1: u?.address?.line1 || '',
      ward: u?.address?.ward || '',
      district: u?.address?.district || '',
      city: u?.address?.city || ''
    })
  }

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login?redirect=/account', { replace: true })
      return
    }
    loadMe()
      .catch((err) => setError(err.message || 'Không tải được thông tin tài khoản'))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value }
    setForm(next)
    setSuccess(null)
    setError(null)
    if (validators[e.target.name]) {
      setFieldErrors((p) => ({ ...p, [e.target.name]: validators[e.target.name](e.target.value) }))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSuccess(null)
    setError(null)

    const nextErrors = Object.fromEntries(
      Object.entries(validators)
        .map(([k, fn]) => [k, fn(form[k])])
        .filter(([, msg]) => msg)
    )
    if (Object.keys(nextErrors).length) {
      setFieldErrors((p) => ({ ...p, ...nextErrors }))
      setError('Vui lòng nhập đúng định dạng thông tin')
      return
    }

    setSaving(true)
    try {
      const res = await api.updateMe({
        name: form.name,
        phone: form.phone,
        addressLine1: form.addressLine1,
        ward: form.ward,
        district: form.district,
        city: form.city
      })
      setSuccess(res.message || 'Đã lưu thông tin')
      if (res.user) setMe(res.user)
    } catch (err) {
      setError(err.message || 'Không lưu được thông tin')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setForm((p) => ({
      ...p,
      phone: '',
      addressLine1: '',
      ward: '',
      district: '',
      city: ''
    }))
    setFieldErrors((p) => ({ ...p, phone: '', addressLine1: '', ward: '', district: '', city: '' }))
    setSuccess(null)
  }

  if (loading) return null

  return (
    <div className="auth-page account-page">
      <div className="container">
        <div className="auth-card account-card">
          <h1 className="auth-title">Tài khoản</h1>
          <p className="auth-subtitle">Quản lý thông tin để đặt hàng nhanh hơn</p>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-error" style={{ color: '#0f766e' }}>{success}</p>}

          <form onSubmit={handleSave} className="auth-form">
            <div className="form-group">
              <label>Họ và tên *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
              {fieldErrors.name && <small className="auth-error">{fieldErrors.name}</small>}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" value={form.email} disabled />
              {fieldErrors.email && <small className="auth-error">{fieldErrors.email}</small>}
              <small className="account-help">Email dùng để đăng nhập và xác thực, hiện chưa hỗ trợ đổi.</small>
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="VD: 0987654321" />
              {fieldErrors.phone && <small className="auth-error">{fieldErrors.phone}</small>}
            </div>

            <div className="form-group">
              <label>Địa chỉ</label>
              <input name="addressLine1" value={form.addressLine1} onChange={handleChange} placeholder="Số nhà, tên đường..." />
            </div>

            <div className="account-grid-3">
              <div className="form-group">
                <label>Phường/Xã</label>
                <input name="ward" value={form.ward} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Quận/Huyện</label>
                <input name="district" value={form.district} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Tỉnh/Thành phố</label>
                <input name="city" value={form.city} onChange={handleChange} />
              </div>
            </div>

            <div className="account-actions">
              <button type="button" className="btn btn-outline" onClick={handleClear} disabled={saving}>
                Xóa thông tin giao hàng
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </form>

          <p className="auth-footer">
            Trạng thái xác thực email: <strong>{me?.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Account

