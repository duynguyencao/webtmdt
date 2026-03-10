import React, { useState, useEffect } from 'react'
import { api } from '../api/client'

const BankTransferInfo = ({ orderId, amount, wrapperClass = '' }) => {
  const [bankInfo, setBankInfo] = useState(null)

  useEffect(() => {
    api.getBankInfo()
      .then(setBankInfo)
      .catch(() => {})
  }, [])

  const buildVietQrUrl = (info, orderIdValue, amountValue) => {
    if (!info?.accountNumber || !info?.bin || !orderIdValue || !amountValue) return null
    const bankId = info.bin
    const accountNumber = info.accountNumber
    const accountName = info.accountHolder || info.name || ''
    const roundedAmount = Math.round(amountValue)
    const addInfo = `Thanh toan don ${orderIdValue}`
    const base = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png`
    const params = new URLSearchParams({
      amount: String(roundedAmount),
      addInfo,
      accountName
    })
    return `${base}?${params.toString()}`
  }

  const qrUrl = buildVietQrUrl(bankInfo, orderId, amount)

  if (!bankInfo || !orderId || !amount) return null

  return (
    <div className={wrapperClass || ''}>
      {qrUrl && (
        <div className="bank-transfer-qr">
          <img src={qrUrl} alt="QR chuyển khoản Vietcombank" />
        </div>
      )}
      <ul className="bank-transfer-info">
        <li>Ngân hàng: {bankInfo.name || 'Vietcombank'}</li>
        <li>Số tài khoản: {bankInfo.accountNumber || '—'}</li>
        <li>Chủ tài khoản: {bankInfo.accountHolder || '—'}</li>
        <li>Số tiền: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}</strong></li>
        <li>
          Nội dung chuyển khoản:{' '}
          <strong>Thanh toan don #{orderId}</strong>
        </li>
      </ul>
      <p className="bank-transfer-warning">
        Lưu ý: <strong>bắt buộc</strong> ghi đúng nội dung chuyển khoản là mã đơn hàng như trên. Nếu ghi sai,
        shop có thể không xác nhận được đơn của bạn.
      </p>
    </div>
  )
}

export default BankTransferInfo

