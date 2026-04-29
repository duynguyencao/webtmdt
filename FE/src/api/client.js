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

  getProductSuggestions(query, limit = 8) {
    const q = new URLSearchParams({
      query: String(query || '').trim(),
      limit: String(limit)
    }).toString()
    return request(`/api/products/suggestions?${q}`)
  },

  getBestSellers(limit = 8) {
    return request(`/api/products/best-sellers?limit=${encodeURIComponent(limit)}`)
  },

  getNewest(limit = 8) {
    return request(`/api/products/newest?limit=${encodeURIComponent(limit)}`)
  },

  getDiscounted(limit = 8) {
    return request(`/api/products/discounted?limit=${encodeURIComponent(limit)}`)
  },

  getRelatedProducts(id, limit = 8) {
    return request(`/api/products/related/${encodeURIComponent(id)}?limit=${encodeURIComponent(limit)}`)
  },

  getCategories() {
    return request('/api/categories')
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

  getOrderPaymentLink(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/payment-link`, { headers: { ...this._authHeaders() } })
  },

  cancelPayOSAndDeleteOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/cancel-payos-and-delete`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  getCart() {
    return request('/api/cart', { headers: { ...this._authHeaders() } })
  },

  updateCart(items) {
    return request('/api/cart', {
      method: 'PUT',
      headers: { ...this._authHeaders() },
      body: JSON.stringify({ items: Array.isArray(items) ? items : [] })
    })
  },

  getProductReviews(productId) {
    return request(`/api/reviews/product/${encodeURIComponent(productId)}`)
  },

  createReview(body) {
    return request('/api/reviews', {
      method: 'POST',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  updateReview(reviewId, body) {
    return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PUT',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body || {})
    })
  },

  deleteReview(reviewId) {
    return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
      headers: { ...this._authHeaders() }
    })
  },

  getShippingQuote(params = {}) {
    const q = new URLSearchParams()
    if (params.city) q.set('city', params.city)
    if (params.district) q.set('district', params.district)
    if (params.ward) q.set('ward', params.ward)
    if (params.itemsCount != null) q.set('itemsCount', String(params.itemsCount))
    return request(`/api/shipping/quote?${q.toString()}`)
  },

  validateCoupon(code, orderTotal) {
    const q = new URLSearchParams({
      code: String(code || '').trim(),
      orderTotal: String(Math.max(0, Number(orderTotal) || 0))
    }).toString()
    return request(`/api/coupons/validate?${q}`)
  },

  getCoupons() {
    return request('/api/coupons', { headers: { ...this._authHeaders() } })
  },

  createCoupon(body) {
    return request('/api/coupons', {
      method: 'POST',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  updateCoupon(code, body) {
    return request(`/api/coupons/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body)
    })
  },

  deleteCoupon(code) {
    return request(`/api/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: { ...this._authHeaders() }
    })
  },

  getSiteConfig() {
    return request('/api/site-config')
  },

  updateSiteConfig(body) {
    return request('/api/site-config', {
      method: 'PUT',
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

  // Shipper APIs
  getShipperAvailableOrders() {
    return request('/api/orders/shipper/available', { headers: { ...this._authHeaders() } })
  },

  getShipperMyTasks() {
    return request('/api/orders/shipper/my-tasks', { headers: { ...this._authHeaders() } })
  },

  pickupOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/pickup`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  deliverOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/deliver`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() }
    })
  },

  failOrder(orderId, action = 'return') {
    return request(`/api/orders/${encodeURIComponent(orderId)}/fail`, {
      method: 'PATCH',
      headers: { ...this._authHeaders() },
      body: JSON.stringify({ action })
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

  verifyEmail(token) {
    const q = new URLSearchParams({ token: String(token || '').trim() }).toString()
    return request(`/api/user/verify-email?${q}`)
  },

  getMe() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return Promise.reject(new Error('Chưa đăng nhập'))
    return request('/api/user/me', { headers: { ...this._authHeaders() } })
  },

  updateMe(body) {
    return request('/api/user/me', {
      method: 'PUT',
      headers: { ...this._authHeaders() },
      body: JSON.stringify(body || {})
    })
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
