import React from 'react'
import { Link } from 'react-router-dom'
import { FiFacebook, FiInstagram, FiYoutube, FiPhone, FiMail } from 'react-icons/fi'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">Về ShopTD</h3>
            <p>
              Hệ thống cửa hàng cầu lông uy tín.
              ShopTD cam kết mang đến những sản phẩm chất lượng tốt nhất.
            </p>
            <div className="social-links">
              <a href="https://www.facebook.com/duy.nguyencao.338" aria-label="Facebook">
                <FiFacebook />
              </a>
              <a href="https://www.instagram.com/trunglmeo/" aria-label="Instagram">
                <FiInstagram />
              </a>
              <a href="https://www.youtube.com/" aria-label="Youtube">
                <FiYoutube />
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Hỗ trợ</h3>
            <ul className="footer-links">
              <li><Link to="/guide">Hướng dẫn mua hàng</Link></li>
              <li><Link to="/payment">Hướng dẫn thanh toán</Link></li>
              <li><Link to="/warranty">Chính sách bảo hành</Link></li>
              <li><Link to="/return">Chính sách đổi trả</Link></li>
              <li><Link to="/shipping">Chính sách vận chuyển</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Liên hệ</h3>
            <ul className="footer-contact">
              <li>
                <FiPhone />
                <span>0902155394 | 0865535162</span>
              </li>
              <li>
                <FiMail />
                <span>contact@shoptd.vn</span>
              </li>
              <li>
                <span>Địa chỉ:  Ngõ 33, Đường Đại Mỗ, P. Đại Mỗ, Hà Nội</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 ShopTD. Tất cả quyền được bảo lưu.</p>
          <p>Địa chỉ:  Ngõ 33, Đường Đại Mỗ, P. Đại Mỗ, Hà Nội</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
