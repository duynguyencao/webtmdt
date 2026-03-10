import React, { useState } from 'react'
import './Contact.css'

const Contact = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.message) return
    setSubmitting(true)
    // Hiện tại chỉ giả lập gửi — có thể nối backend sau
    setTimeout(() => {
      setSubmitting(false)
      setSent(true)
      setForm({ name: '', email: '', phone: '', message: '' })
    }, 600)
  }

  return (
    <div className="contact-page">
      <div className="container">
        <div className="contact-hero">
          <h1 className="page-title">Liên Hệ ShopTD</h1>
          <p className="contact-hero-subtitle">
            Nếu bạn cần tư vấn chọn vợt, kiểm tra đơn hàng hoặc hỗ trợ bảo hành, hãy liên hệ với chúng tôi qua
            hotline hoặc gửi form bên dưới.
          </p>
        </div>

        <div className="contact-layout">
          <section className="contact-info">
            <h2>Thông tin liên hệ</h2>
            <div className="contact-info-grid">
              <div className="contact-info-item">
                <h3>Hotline đặt hàng</h3>
                <p className="contact-hotline">0977 508 430</p>
                <p>Thời gian: 8:00 – 21:00 (tất cả các ngày trong tuần).</p>
              </div>
              <div className="contact-info-item">
                <h3>Email hỗ trợ</h3>
                <p className="contact-email">contact@shoptd.vn</p>
                <p>Gửi góp ý, phản hồi dịch vụ hoặc yêu cầu báo giá sỉ.</p>
              </div>
              <div className="contact-info-item">
                <h3>Địa chỉ văn phòng</h3>
                <p>PTIT_HN</p>
                <p>Cơ sở chính ShopTD tại Học viện Công nghệ Bưu chính Viễn thông - Hà Nội.</p>
              </div>
            </div>

            <div className="contact-map-placeholder">
              <p>
                Bạn có thể tìm kiếm &quot;ShopTD PTIT_HN&quot; trên Google Maps để xem đường đi đến cửa hàng.
              </p>
            </div>
          </section>

          <section className="contact-form-section">
            <h2>Gửi tin nhắn cho chúng tôi</h2>
            <p className="contact-form-subtitle">
              Điền thông tin bên dưới, đội ngũ tư vấn sẽ liên hệ lại trong thời gian sớm nhất.
            </p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="(Tùy chọn)"
                />
              </div>

              <div className="form-group">
                <label>Nội dung cần hỗ trợ *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Ví dụ: cần tư vấn chọn vợt, kiểm tra đơn hàng ORD000123..."
                  required
                />
              </div>

              {sent && (
                <p className="contact-success">
                  Cảm ơn bạn! Tin nhắn đã được ghi nhận, chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Contact

