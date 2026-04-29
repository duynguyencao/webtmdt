import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import './Shipper.css'

const formatPrice = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0)

const Shipper = () => {
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('available') // available | tasks
  const [available, setAvailable] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadAll = async () => {
    const [a, t] = await Promise.all([
      api.getShipperAvailableOrders(),
      api.getShipperMyTasks()
    ])
    setAvailable(Array.isArray(a) ? a : [])
    setTasks(Array.isArray(t) ? t : [])
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        if (!api.getToken()) {
          setError('Chưa đăng nhập')
          return
        }
        const u = await api.getMe()
        setMe(u)
        if (u?.role !== 'shipper') {
          setError('Tài khoản không có quyền shipper')
          return
        }
        await loadAll()
      } catch (err) {
        setError(err.message || 'Không tải được dữ liệu')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const currentList = useMemo(() => (tab === 'available' ? available : tasks), [tab, available, tasks])

  const handlePickup = async (orderId) => {
    if (busyId) return
    setBusyId(orderId)
    try {
      await api.pickupOrder(orderId)
      await loadAll()
      setTab('tasks')
    } catch (err) {
      alert(err.message || 'Không nhận được đơn')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeliver = async (orderId) => {
    if (busyId) return
    setBusyId(orderId)
    try {
      await api.deliverOrder(orderId)
      await loadAll()
    } catch (err) {
      alert(err.message || 'Không cập nhật được')
    } finally {
      setBusyId(null)
    }
  }

  const handleFail = async (orderId) => {
    if (busyId) return
    const ok = window.confirm('Không giao được. Bạn muốn trả đơn về trạng thái chờ giao?')
    if (!ok) return
    setBusyId(orderId)
    try {
      await api.failOrder(orderId, 'return')
      await loadAll()
      setTab('available')
    } catch (err) {
      alert(err.message || 'Không cập nhật được')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="shipper-page"><div className="shipper-shell">Đang tải...</div></div>
  if (error) return <div className="shipper-page"><div className="shipper-shell shipper-error">{error}</div></div>

  return (
    <div className="shipper-page">
      <div className="shipper-shell">
        <div className="shipper-top">
          <div>
            <div className="shipper-title">Shipper</div>
            <div className="shipper-sub">Xin chào, {me?.name || '—'}</div>
          </div>
          <button className="btn btn-outline btn-sm" type="button" onClick={() => { api.logout(); window.location.href = '/login' }}>
            Đăng xuất
          </button>
        </div>

        <div className="shipper-tabs">
          <button type="button" className={`shipper-tab ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>
            Chờ lấy hàng ({available.length})
          </button>
          <button type="button" className={`shipper-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            Đang giao ({tasks.length})
          </button>
        </div>

        {currentList.length === 0 ? (
          <div className="shipper-empty">Không có đơn phù hợp.</div>
        ) : (
          <div className="shipper-list">
            {currentList.map((o) => {
              const address = o?.customer?.address || ''
              const phone = o?.customer?.phone || ''
              const cod = String(o?.paymentMethod || '').toLowerCase() === 'cod'
              return (
                <div key={o.orderId} className="shipper-card">
                  <div className="shipper-card-head">
                    <div className="shipper-oid">#{o.orderId}</div>
                    <div className={`shipper-badge ${tab === 'available' ? 'b1' : 'b2'}`}>{tab === 'available' ? 'Chờ lấy' : 'Đang giao'}</div>
                  </div>
                  <div className="shipper-row">
                    <div className="shipper-k">Khách</div>
                    <div className="shipper-v"><strong>{o?.customer?.name || '—'}</strong></div>
                  </div>
                  <div className="shipper-row">
                    <div className="shipper-k">SĐT</div>
                    <a className="shipper-v shipper-phone" href={`tel:${phone}`}>{phone || '—'}</a>
                  </div>
                  <div className="shipper-row">
                    <div className="shipper-k">Địa chỉ</div>
                    <div className="shipper-v">{address || '—'}</div>
                  </div>
                  <div className="shipper-row shipper-money">
                    <div className="shipper-k">Thu</div>
                    <div className="shipper-v"><strong>{cod ? formatPrice(o.total) : formatPrice(0)}</strong></div>
                  </div>

                  {tab === 'available' ? (
                    <button
                      type="button"
                      className="btn btn-primary shipper-btn"
                      disabled={busyId === o.orderId}
                      onClick={() => handlePickup(o.orderId)}
                    >
                      {busyId === o.orderId ? 'Đang nhận...' : 'Nhận giao đơn này'}
                    </button>
                  ) : (
                    <div className="shipper-actions">
                      <button
                        type="button"
                        className="btn btn-primary shipper-btn"
                        disabled={busyId === o.orderId}
                        onClick={() => handleDeliver(o.orderId)}
                      >
                        {busyId === o.orderId ? 'Đang cập nhật...' : 'Đã giao thành công'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline shipper-btn"
                        disabled={busyId === o.orderId}
                        onClick={() => handleFail(o.orderId)}
                      >
                        Giao thất bại
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Shipper

