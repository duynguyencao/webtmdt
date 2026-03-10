const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TOKEN_KEY = 'token'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Lỗi kết nối API')
  return data
}

export const api = {
  getProducts(params = {}) {
    const q = new URLSearchParams(params).toString()
    return request(`/api/products${q ? `?${q}` : ''}`)
  },

  getProductDetail(id) {
    return request(`/api/products/${id}`)
  },

  getCategories() {
    return request('/api/categories')
  },

  getBankInfo() {
    return request('/api/bank/info')
  },

  postChat(message, history = []) {
    return request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: String(message).trim(), history })
    })
  },

  createOrder(body) {
    if (!body?.customer?.name || !body?.customer?.phone || !Array.isArray(body?.items) || body.items.length === 0) {
      return Promise.reject(new Error('Thiếu thông tin: tên, số điện thoại hoặc danh sách sản phẩm.'))
    }
    return request('/api/orders', {
      method: 'POST',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  getMyOrders() {
    return request('/api/orders/me', { headers: { ...this._authHeaders() } })
  },

  getOrders(params = {}) {
    const q = new URLSearchParams()
    if (params.orderId && String(params.orderId).trim()) q.set('orderId', String(params.orderId).trim())
    const query = q.toString()
    return request(`/api/orders${query ? `?${query}` : ''}`, { headers: { ...this._authHeaders() } })
  },

  getOrderDetail(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}`, { headers: { ...this._authHeaders() } })
  },

  confirmOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/confirm`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  cancelOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  cancelOrderByBuyer(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/cancel-by-buyer`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  markOrderPaid(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/mark-paid`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  login(email, password) {
    return request('/api/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },

  register(name, email, password) {
    return request('/api/user/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    })
  },

  getMe() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return Promise.reject(new Error('Chưa đăng nhập'))
    return request('/api/user/me', { headers: { ...this._authHeaders() } })
  },

  _authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY)
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  createProduct(body) {
    return request('/api/products', {
      method: 'POST',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  updateProduct(id, body) {
    return request(`/api/products/${id}`, {
      method: 'PUT',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  deleteProduct(id) {
    return request(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { ...this._authHeaders() }
    })
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY),
  logout: () => localStorage.removeItem(TOKEN_KEY)
}
