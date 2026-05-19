import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AdminLayout from '../components/AdminLayout'
import NoticeToast from '../components/NoticeToast'
import './AdminUsers.css'

const ROLE_LABELS = { admin: 'Admin', buyer: 'Khách hàng', shipper: 'Shipper' }

const AdminUsers = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [notice, setNotice] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 2500)
  }

  const loadUsers = async () => {
    try {
      const list = await api.getUsers()
      setUsers(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getMe()
      .then((u) => {
        if (u.role !== 'admin') {
          navigate('/', { replace: true })
          return
        }
        return loadUsers()
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  const handleLock = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn khóa tài khoản "${user.name}" (${user.email})?`)) return
    setActionLoading(user.id)
    try {
      await api.lockUser(user.id)
      showNotice(`Đã khóa tài khoản ${user.name}`)
      await loadUsers()
    } catch (err) {
      showNotice(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnlock = async (user) => {
    setActionLoading(user.id)
    try {
      await api.unlockUser(user.id)
      showNotice(`Đã mở khóa tài khoản ${user.name}`)
      await loadUsers()
    } catch (err) {
      showNotice(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN tài khoản "${user.name}" (${user.email})?\n\nHành động này không thể hoàn tác!`)) return
    setActionLoading(user.id)
    try {
      await api.deleteUser(user.id)
      showNotice(`Đã xóa tài khoản ${user.name}`)
      if (detailOpen && detailUser?.id === user.id) {
        setDetailOpen(false)
        setDetailUser(null)
      }
      await loadUsers()
    } catch (err) {
      showNotice(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const openDetail = async (user) => {
    try {
      const full = await api.getUserDetail(user.id)
      setDetailUser(full)
      setDetailOpen(true)
    } catch (err) {
      showNotice('Không thể tải thông tin: ' + err.message, 'error')
    }
  }

  const getStatusBadge = (user) => {
    if (user.isLocked) return <span className="user-status-badge locked">Đã khóa</span>
    if (!user.emailVerified) return <span className="user-status-badge unverified">Chưa xác thực</span>
    return <span className="user-status-badge active">Hoạt động</span>
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const filteredUsers = users
    .filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      const q = searchText.trim().toLowerCase()
      if (!q) return true
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })

  if (loading) {
    return (
      <AdminLayout title="Quản lý tài khoản" subtitle="Xem, khóa và xóa tài khoản người dùng">
        <div className="admin-users-page">
          <div className="admin-loading">Đang tải danh sách tài khoản...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Quản lý tài khoản" subtitle="Xem, khóa và xóa tài khoản người dùng">
      <NoticeToast message={notice?.message} type={notice?.type} />
      <div className="admin-users-page">
        <div className="admin-header">
          <h2>Danh sách tài khoản ({filteredUsers.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              className="admin-filter-input"
              placeholder="Tìm theo tên hoặc email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className="admin-filter-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              <option value="buyer">Khách hàng</option>
              <option value="admin">Admin</option>
              <option value="shipper">Shipper</option>
            </select>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(u)}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`user-role-badge ${u.role}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>{getStatusBadge(u)}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="admin-actions-cell">
                      {u.role !== 'admin' && (
                        <>
                          {u.isLocked ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleUnlock(u)}
                              disabled={actionLoading === u.id}
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning"
                              onClick={() => handleLock(u)}
                              disabled={actionLoading === u.id}
                            >
                              Khóa
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(u)}
                            disabled={actionLoading === u.id}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <p className="admin-empty">Không tìm thấy tài khoản phù hợp.</p>
          )}
        </div>

        {/* Modal chi tiết tài khoản */}
        {detailOpen && detailUser && (
          <div className="admin-user-modal" onClick={() => { setDetailOpen(false); setDetailUser(null) }}>
            <div className="admin-user-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Chi tiết tài khoản</h2>
              <table className="admin-user-detail-table">
                <tbody>
                  <tr>
                    <th>Tên</th>
                    <td>{detailUser.name || '—'}</td>
                  </tr>
                  <tr>
                    <th>Email</th>
                    <td>{detailUser.email}</td>
                  </tr>
                  <tr>
                    <th>SĐT</th>
                    <td>{detailUser.phone || '—'}</td>
                  </tr>
                  <tr>
                    <th>Vai trò</th>
                    <td>
                      <span className={`user-role-badge ${detailUser.role}`}>
                        {ROLE_LABELS[detailUser.role] || detailUser.role}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Trạng thái</th>
                    <td>{getStatusBadge(detailUser)}</td>
                  </tr>
                  <tr>
                    <th>Email xác thực</th>
                    <td>{detailUser.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</td>
                  </tr>
                  <tr>
                    <th>Địa chỉ</th>
                    <td>
                      {[
                        detailUser.address?.line1,
                        detailUser.address?.wardName,
                        detailUser.address?.districtName,
                        detailUser.address?.cityName
                      ].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                  <tr>
                    <th>Ngày tạo</th>
                    <td>{formatDate(detailUser.createdAt)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="admin-user-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setDetailOpen(false); setDetailUser(null) }}
                >
                  Đóng
                </button>
                {detailUser.role !== 'admin' && (
                  <>
                    {detailUser.isLocked ? (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => { handleUnlock(detailUser); setDetailOpen(false); setDetailUser(null) }}
                      >
                        Mở khóa
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={() => { handleLock(detailUser); setDetailOpen(false); setDetailUser(null) }}
                      >
                        Khóa
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => { handleDelete(detailUser) }}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminUsers
