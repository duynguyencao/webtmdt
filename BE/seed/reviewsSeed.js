const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(16 + (days % 5), 20, 0, 0)
  return date
}

export const buildReviewsSeed = ({ buyerId }) => ([
  { productId: 1, orderId: 'ORD000001', rating: 5, comment: 'Vot dam tay, phan cong rat tot.', days: 1 },
  { productId: 2, orderId: 'ORD000001', rating: 4, comment: 'Cam giac on dinh, hop nguoi moi nang trinh.', days: 1 },
  { productId: 3, orderId: 'ORD000002', rating: 5, comment: 'Luc danh chac, mau ngoai dep hon anh.', days: 4 },
  { productId: 9, orderId: 'ORD000007', rating: 4, comment: 'Can bang tot, giao hang dung hen.', days: 29 },
  { productId: 10, orderId: 'ORD000007', rating: 3, comment: 'Dung on, can them thoi gian de quen.', days: 28 },
  { productId: 11, orderId: 'ORD000008', rating: 5, comment: 'Rat hop loi danh tan cong.', days: 37 },
  { productId: 14, orderId: 'ORD000010', rating: 4, comment: 'Gia tot, chat luong dung ky vong.', days: 60 },
  { productId: 16, orderId: 'ORD000012', rating: 5, comment: 'Da mua lan hai, van rat ung.', days: 100 }
].map(({ days, ...review }) => {
  const createdAt = daysAgo(days)
  return {
    ...review,
    userId: buyerId,
    verified: true,
    createdAt,
    updatedAt: createdAt
  }
}))
