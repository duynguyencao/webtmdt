import { Router } from 'express'
import Order from '../models/Order.js'
import Coupon from '../models/Coupon.js'
import { PayOS } from '@payos/node'

const router = Router()

const createPayOSClient = () => {
  const clientId = String(process.env.PAYOS_CLIENT_ID || '').trim()
  const apiKey = String(process.env.PAYOS_API_KEY || '').trim()
  const checksumKey = String(process.env.PAYOS_CHECKSUM_KEY || '').trim()
  if (!clientId || !apiKey || !checksumKey) {
    throw new Error('PayOS chưa cấu hình: thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong .env')
  }
  return new PayOS({ clientId, apiKey, checksumKey })
}

router.post('/webhook', async (req, res) => {
  try {
    const payOS = createPayOSClient()

    console.log('[PayOS webhook] received:', {
      description: req.body?.description,
      orderCode: req.body?.data?.orderCode ?? req.body?.orderCode,
      success: req.body?.success ?? req.body?.data?.success
    })

    // verify() sẽ validate chữ ký checksum trước khi trả dữ liệu đã parse
    const webhookData = await payOS.webhooks.verify(req.body)

    const data = webhookData?.data || {}
    const successByField =
      webhookData?.success === true ||
      webhookData?.code === '00' ||
      data?.code === '00' ||
      data?.success === true ||
      String(data?.desc || '').toLowerCase().includes('thành công') ||
      String(data?.desc || '').toLowerCase().includes('thanh cong')

    if (!successByField) {
      return res.status(200).json({ received: true, ignored: true })
    }

    const orderIdFromDescription = String(data?.description || webhookData?.description || '').trim()
    const rawOrderCode = data?.orderCode ?? data?.order_code ?? data?.order_code_number ?? null
    const orderIdFromOrderCode = rawOrderCode != null
      ? `ORD${String(rawOrderCode).replace(/\D/g, '').padStart(6, '0')}`
      : ''

    const orderId = orderIdFromDescription || orderIdFromOrderCode
    if (!orderId) {
      console.log('[PayOS webhook] Cannot map orderId:', {
        orderIdFromDescription,
        orderIdFromOrderCode,
        rawOrderCode
      })
      return res.status(200).json({ received: true, ignored: true })
    }

    const order = await Order.findOne({ orderId })
    if (!order) {
      console.log('[PayOS webhook] Order not found:', { orderId })
      return res.status(200).json({ received: true, ignored: true })
    }

    if (order.paymentStatus !== 'paid') {
      console.log('[PayOS webhook] Mark paid:', { orderId, from: order.paymentStatus, to: 'paid' })
      order.paymentStatus = 'paid'
      const currentStatus = order.status || 'pending'
      if (currentStatus === 'pending') order.status = 'confirmed'
      await order.save()
    }

    // Với PayOS: chỉ "tiêu" lượt dùng coupon khi đã thanh toán thành công.
    if (order.paymentStatus === 'paid' && order.couponCode && !order.couponConsumed) {
      const coupon = await Coupon.findOne({ code: order.couponCode })
      if (coupon) {
        coupon.usedCount = (coupon.usedCount || 0) + 1
        await coupon.save()
        order.couponConsumed = true
        await order.save()
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[PayOS webhook] verify/process failed:', err?.message || err)
    return res.status(400).json({ error: err.message || 'Invalid PayOS webhook' })
  }
})

export default router

