/**
 * Danh sách user mẫu để đẩy vào DB khi chạy `npm run seed`.
 * Mật khẩu sẽ được hash tự động bởi model User (bcrypt).
 * Chỉ tạo user nếu email chưa tồn tại (không xóa user cũ).
 * Role: buyer = người mua, admin = người bán / quản trị.
 */
export const usersSeed = [
  { name: 'Admin', email: 'admin@caulong.vn', password: 'admin123', role: 'admin' },
  { name: 'Người mua 1', email: 'buyer@caulong.vn', password: 'buyer123', role: 'buyer' }
]
