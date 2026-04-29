import cron from 'node-cron'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { PayOS } from '@payos/node'

const defaultSkuForProductId = (productId) => `P${productId}-DEFAULT` // legacy

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
            { id: productId, isDeleted: { $ne: true } },
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

        order.status = 'cancelled'
        await order.save()
      }
    } catch (err) {
      console.error('[cron] autoCancelPendingPayOS failed:', err?.message || err)
    }
  })
}

