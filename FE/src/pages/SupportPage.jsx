import React from 'react'
import { Link } from 'react-router-dom'
import './SupportPage.css'

const SUPPORT_CONTENT = {
  guide: {
    title: 'Hướng dẫn mua hàng',
    intro: 'ShopTD hỗ trợ đặt hàng trực tuyến nhanh chóng, phù hợp cho cả khách mua lẻ và khách cần tư vấn chọn vợt.',
    sections: [
      {
        heading: 'Các bước đặt hàng',
        items: [
          'Tìm sản phẩm bằng thanh tìm kiếm hoặc vào trang Sản phẩm.',
          'Mở chi tiết sản phẩm để xem mô tả, tồn kho, giá và đánh giá.',
          'Chọn số lượng phù hợp rồi bấm Thêm vào giỏ.',
          'Kiểm tra giỏ hàng, áp dụng mã giảm giá nếu có, sau đó tiến hành thanh toán.'
        ]
      },
      {
        heading: 'Tư vấn chọn sản phẩm',
        items: [
          'Người mới nên ưu tiên vợt dễ kiểm soát, trọng lượng vừa tay.',
          'Người chơi thiên công có thể chọn vợt nặng đầu, thân cứng hơn.',
          'Nếu chưa chắc lựa chọn, hãy liên hệ ShopTD để được gợi ý theo trình độ và ngân sách.'
        ]
      }
    ]
  },
  payment: {
    title: 'Hướng dẫn thanh toán',
    intro: 'ShopTD hiện hỗ trợ thanh toán khi nhận hàng và thanh toán trực tuyến qua PayOS.',
    sections: [
      {
        heading: 'Thanh toán COD',
        items: [
          'Khách hàng thanh toán trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.',
          'Đơn COD sẽ được xử lý sau khi admin xác nhận thông tin đặt hàng.'
        ]
      },
      {
        heading: 'Thanh toán PayOS',
        items: [
          'Sau khi đặt hàng, hệ thống chuyển sang cổng thanh toán PayOS.',
          'Đơn hàng chỉ được ghi nhận đã thanh toán khi PayOS trả trạng thái thành công.',
          'Nếu thanh toán bị hủy, khách có thể quay lại đơn hàng để xử lý tiếp.'
        ]
      }
    ]
  },
  warranty: {
    title: 'Chính sách bảo hành',
    intro: 'Sản phẩm tại ShopTD được hỗ trợ bảo hành theo điều kiện của nhà sản xuất và tình trạng thực tế.',
    sections: [
      {
        heading: 'Điều kiện bảo hành',
        items: [
          'Sản phẩm còn trong thời hạn bảo hành và có thông tin đơn hàng hợp lệ.',
          'Lỗi phát sinh từ nhà sản xuất, không phải do va đập, sử dụng sai cách hoặc tự ý sửa chữa.',
          'Tem, mã sản phẩm hoặc dấu hiệu nhận diện còn nguyên vẹn nếu nhà sản xuất yêu cầu.'
        ]
      },
      {
        heading: 'Quy trình tiếp nhận',
        items: [
          'Khách hàng liên hệ ShopTD và cung cấp mã đơn hàng, hình ảnh/video lỗi.',
          'ShopTD kiểm tra sơ bộ và hướng dẫn gửi sản phẩm về điểm tiếp nhận.',
          'Thời gian xử lý phụ thuộc vào từng hãng và tình trạng sản phẩm.'
        ]
      }
    ]
  },
  return: {
    title: 'Chính sách đổi trả',
    intro: 'ShopTD hỗ trợ đổi trả khi sản phẩm giao không đúng, lỗi do vận chuyển hoặc lỗi xác nhận từ nhà sản xuất.',
    sections: [
      {
        heading: 'Trường hợp được hỗ trợ',
        items: [
          'Sản phẩm giao sai mẫu, sai số lượng hoặc sai thông tin đặt hàng.',
          'Sản phẩm bị lỗi kỹ thuật khi nhận hàng.',
          'Sản phẩm hư hỏng do quá trình vận chuyển và được phản hồi sớm sau khi nhận.'
        ]
      },
      {
        heading: 'Lưu ý đổi trả',
        items: [
          'Sản phẩm cần còn đầy đủ phụ kiện, bao bì và quà tặng kèm nếu có.',
          'ShopTD có thể từ chối đổi trả nếu sản phẩm có dấu hiệu đã sử dụng sai mục đích.',
          'Chi phí vận chuyển đổi trả sẽ được thông báo theo từng trường hợp cụ thể.'
        ]
      }
    ]
  },
  shipping: {
    title: 'Chính sách vận chuyển',
    intro: 'ShopTD giao hàng toàn quốc với thời gian xử lý phụ thuộc khu vực nhận hàng và trạng thái tồn kho.',
    sections: [
      {
        heading: 'Thời gian giao hàng',
        items: [
          'Nội thành Hà Nội: thường từ 1 đến 2 ngày làm việc sau khi xác nhận đơn.',
          'Các tỉnh/thành khác: thường từ 2 đến 5 ngày làm việc tùy đơn vị vận chuyển.',
          'Đơn hàng có thanh toán trực tuyến sẽ được xử lý sau khi hệ thống xác nhận thanh toán.'
        ]
      },
      {
        heading: 'Phí vận chuyển',
        items: [
          'Phí vận chuyển được tính theo địa chỉ nhận hàng và tổng khối lượng đơn.',
          'Một số chương trình khuyến mãi có thể hỗ trợ hoặc miễn phí vận chuyển.',
          'Khách hàng nên kiểm tra kỹ thông tin liên hệ để đơn hàng được giao đúng thời gian.'
        ]
      }
    ]
  }
}

const SupportPage = ({ type }) => {
  const content = SUPPORT_CONTENT[type] || SUPPORT_CONTENT.guide

  return (
    <main className="support-page">
      <div className="container">
        <nav className="support-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>{content.title}</span>
        </nav>

        <section className="support-panel">
          <h1>{content.title}</h1>
          <p className="support-intro">{content.intro}</p>

          <div className="support-section-list">
            {content.sections.map((section) => (
              <section key={section.heading} className="support-section">
                <h2>{section.heading}</h2>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default SupportPage
