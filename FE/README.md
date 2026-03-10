# ShopTD - Website Thương Mại Điện Tử Bán Đồ Cầu Lông

Website thương mại điện tử chuyên bán các sản phẩm cầu lông, được xây dựng với React và Vite.

## Tính năng

- 🏠 **Trang chủ**: Hero section, danh mục sản phẩm, sản phẩm nổi bật
- 🛍️ **Sản phẩm**: Danh sách sản phẩm với bộ lọc và sắp xếp
- 📦 **Chi tiết sản phẩm**: Thông tin chi tiết, hình ảnh, thông số kỹ thuật
- 🛒 **Giỏ hàng**: Quản lý giỏ hàng với thêm/xóa/sửa số lượng
- 💳 **Thanh toán**: Form đặt hàng với thông tin giao hàng và phương thức thanh toán
- 📱 **Responsive**: Tối ưu cho mọi thiết bị

## Công nghệ sử dụng

- **React 18** - UI Framework
- **React Router DOM** - Routing
- **Vite** - Build tool
- **React Icons** - Icon library
- **CSS3** - Styling với custom properties

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy development server:
```bash
npm run dev
```

3. Build cho production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Cấu trúc dự án

```
src/
├── components/       # Các component tái sử dụng
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── ProductCard.jsx
│   └── CategoryCard.jsx
├── pages/           # Các trang chính
│   ├── Home.jsx
│   ├── Products.jsx
│   ├── ProductDetail.jsx
│   ├── Cart.jsx
│   └── Checkout.jsx
├── context/         # React Context
│   └── CartContext.jsx
├── App.jsx          # Component chính
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Tính năng nổi bật

### Giỏ hàng
- Thêm/xóa sản phẩm
- Cập nhật số lượng
- Lưu trữ trong localStorage
- Tính tổng tiền tự động

### Bộ lọc sản phẩm
- Lọc theo danh mục
- Lọc theo thương hiệu
- Lọc theo khoảng giá
- Sắp xếp theo nhiều tiêu chí

### Responsive Design
- Mobile-first approach
- Breakpoints tối ưu
- Navigation menu responsive

## Màu sắc chủ đạo

- Primary: `#e63946` (Đỏ)
- Secondary: `#457b9d` (Xanh dương)
- Text Dark: `#1d3557`
- Background: `#f8f9fa`

## License

MIT
