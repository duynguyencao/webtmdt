/**
 * jobs/autoCancelPendingPayOS.js — Cron job tự động hủy đơn PayOS quá hạn.
 *
 * Kịch bản:
 *   Khách chọn thanh toán PayOS nhưng không hoàn tất (đóng tab, quên, v.v.)
 *   → Đơn hàng mắc kẹt ở status='pending', paymentStatus='pending_payment'.
 *   → Cron job này chạy mỗi 5 phút, quét đơn PayOS pending quá 15 phút.
 *
 * Luồng xử lý cho mỗi đơn quá hạn:
 *   1. Kiểm tra trạng thái thật trên PayOS (tránh hủy nhầm nếu webhook bị lỗi).
 *      - Nếu đã thanh toán → chuyển status='confirmed', paymentStatus='paid'.
 *      - Nếu chưa thanh toán → tiếp tục hủy.
 *   2. Hoàn kho (Product.stock += quantity).
 *   3. Hoàn coupon nếu đã consume.
 *   4. Cancel payment request trên PayOS (tránh late-payment).
 *   5. Đổi status='cancelled'.
 *
 * Giới hạn: mỗi lần quét tối đa 50 đơn (tránh quá tải).
 */

import cron from 'node-cron'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { PayOS } from '@payos/node'

const createPayOSClient = () => {
  const clientId = String(process.env.PAYOS_CLIENT_ID || '').trim()
  const apiKey = String(process.env.PAYOS_API_KEY || '').trim()
  const checksumKey = String(process.env.PAYOS_CHECKSUM_KEY || '').trim()
  if (!clientId || !apiKey || !checksumKey) {
    throw new Error('PayOS chưa cấu hình: thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong .env')
  }
  return new PayOS({ clientId, apiKey, checksumKey })
}

const isPaidByPayOS = async (payOS, order) => {
  const paymentLinkId = String(order?.payosPaymentLinkId || '').trim()
  if (!paymentLinkId) return false
  try {
    const resp = await payOS.get(`/v2/payment-requests/${encodeURIComponent(paymentLinkId)}`)
    const data = resp?.data || resp
    const status = String(data?.status || data?.data?.status || '').toLowerCase()
    return status === 'paid' || status === 'success'
  } catch {
    return false
  }
}

export function startAutoCancelPendingPayOSJob() {
  // Mỗi 5 phút quét 1 lần
  return cron.schedule('*/5 * * * *', async () => {
    const now = Date.now()
    const cutoff = new Date(now - 15 * 60 * 1000) // 15 phút

    try {
      const payOS = createPayOSClient()
      const stale = await Order.find({
        paymentMethod: 'payos',
        paymentStatus: 'pending_payment',
        status: 'pending',
        createdAt: { $lt: cutoff }
      }).limit(50) // tránh quét quá nhiều 1 lần

      if (!stale.length) return

      for (const order of stale) {
        // Bảo vệ: nếu khách đã thanh toán nhưng webhook lỗi, check trạng thái thật từ PayOS trước khi hủy.
        const paid = await isPaidByPayOS(payOS, order)
        if (paid) {
          if (order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid'
            if ((order.status || 'pending') === 'pending') order.status = 'confirmed'
          }
          // Consume coupon nếu chưa
          if (order.couponCode && !order.couponConsumed) {
            const coupon = await Coupon.findOne({ code: order.couponCode })
            if (coupon) {
              coupon.usedCount = (coupon.usedCount || 0) + 1
              await coupon.save()
              order.couponConsumed = true
            }
          }
          await order.save()
          continue
        }

        // Hoàn kho theo Product.stock (1 biến thể duy nhất)
        for (const item of (order.items || [])) {
          const productId = item?.id != null ? Number(item.id) : null
          if (productId == null) continue
          const qty = Math.max(0, Number(item.quantity) || 0)
          if (!qty) continue
          await Product.updateOne(
            { id: productId },
            { $inc: { stock: qty } }
          )
        }

        // Hoàn coupon nếu đã "consume" (với PayOS pending thì luôn hoàn)
        if (order.couponCode && order.couponConsumed) {
          const coupon = await Coupon.findOne({ code: order.couponCode })
          if (coupon) {
            coupon.usedCount = Math.max(0, (coupon.usedCount || 0) - 1)
            await coupon.save()
            order.couponConsumed = false
          }
        }

        // Best-effort cancel payment request trên PayOS để tránh late-payment
        try {
          const paymentLinkId = String(order.payosPaymentLinkId || '').trim()
          if (paymentLinkId) {
            await payOS.paymentRequests.cancel(paymentLinkId, 'Auto cancel pending PayOS order')
          }
        } catch {
          // ignore
        }

        order.status = 'cancelled'
        await order.save()
      }
    } catch (err) {
      console.error('[cron] autoCancelPendingPayOS failed:', err?.message || err)
    }
  })
}

