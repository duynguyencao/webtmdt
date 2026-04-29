import cron from 'node-cron'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'

const defaultSkuForProductId = (productId) => `P${productId}-DEFAULT`

export function startAutoCancelPendingPayOSJob() {
  // Mỗi 5 phút quét 1 lần
  return cron.schedule('*/5 * * * *', async () => {
    const now = Date.now()
    const cutoff = new Date(now - 15 * 60 * 1000) // 15 phút

    try {
      const stale = await Order.find({
        paymentMethod: 'payos',
        paymentStatus: 'pending_payment',
        status: 'pending',
        createdAt: { $lt: cutoff }
      }).limit(50) // tránh quét quá nhiều 1 lần

      if (!stale.length) return

      for (const order of stale) {
        // Hoàn kho theo từng SKU
        for (const item of (order.items || [])) {
          const productId = item?.id != null ? Number(item.id) : null
          if (productId == null) continue
          const qty = Math.max(0, Number(item.quantity) || 0)
          if (!qty) continue
          const sku = String(item.sku || '').trim() || defaultSkuForProductId(productId)
          await Product.updateOne(
            { id: productId, isDeleted: { $ne: true }, 'variants.sku': sku },
            { $inc: { 'variants.$.stock': qty } }
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

