const customer = {
  name: 'Buyer',
  phone: '0900000001',
  email: 'buyer@caulong.vn',
  address: '12 Nguyen Trai',
  city: '01',
  cityName: 'Ha Noi',
  district: '001',
  districtName: 'Ba Dinh',
  ward: '00001',
  wardName: 'Phuc Xa'
}

const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(10 + (days % 7), 15, 0, 0)
  return date
}

export const buildOrdersSeed = ({ buyerId, products }) => {
  const byId = new Map(products.map((product) => [product.id, product]))
  const item = (id, quantity) => {
    const product = byId.get(id)
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: product.price,
      quantity
    }
  }
  const totalOf = (items) => items.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const configs = [
    { id: 'ORD000001', days: 2, status: 'delivered', method: 'cod', lines: [[1, 1], [2, 1]] },
    { id: 'ORD000002', days: 5, status: 'delivered', method: 'payos', paymentStatus: 'paid', lines: [[3, 1]] },
    { id: 'ORD000003', days: 9, status: 'shipped', method: 'cod', lines: [[4, 1], [5, 1]] },
    { id: 'ORD000004', days: 13, status: 'confirmed', method: 'payos', paymentStatus: 'paid', lines: [[6, 1]] },
    { id: 'ORD000005', days: 18, status: 'pending', method: 'cod', lines: [[7, 2]] },
    { id: 'ORD000006', days: 24, status: 'cancelled', method: 'cod', lines: [[8, 1]] },
    { id: 'ORD000007', days: 31, status: 'delivered', method: 'payos', paymentStatus: 'paid', lines: [[9, 1], [10, 1]] },
    { id: 'ORD000008', days: 39, status: 'delivered', method: 'cod', lines: [[11, 1]] },
    { id: 'ORD000009', days: 48, status: 'confirmed', method: 'cod', lines: [[12, 1], [13, 1]] },
    { id: 'ORD000010', days: 63, status: 'delivered', method: 'cod', lines: [[14, 1]] },
    { id: 'ORD000011', days: 82, status: 'shipped', method: 'payos', paymentStatus: 'paid', lines: [[15, 1]] },
    { id: 'ORD000012', days: 104, status: 'delivered', method: 'cod', lines: [[16, 1], [17, 1]] }
  ]

  return configs.map((cfg) => {
    const items = cfg.lines.map(([id, quantity]) => item(id, quantity))
    const total = totalOf(items)
    const createdAt = daysAgo(cfg.days)
    return {
      orderId: cfg.id,
      userId: buyerId,
      customer,
      items,
      subtotal: total,
      discount: 0,
      total,
      paymentMethod: cfg.method,
      paymentStatus: cfg.paymentStatus ?? null,
      status: cfg.status,
      note: `Don seed ${cfg.status}`,
      createdAt,
      updatedAt: createdAt
    }
  })
}
