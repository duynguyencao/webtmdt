import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6)
})

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
})

export const orderCreateSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2),
    phone: z.string().trim().min(6),
    email: z.string().trim().email().optional().or(z.literal('')).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    cityName: z.string().optional(),
    district: z.string().optional(),
    districtName: z.string().optional(),
    ward: z.string().optional(),
    wardName: z.string().optional()
  }),
  items: z.array(z.object({
    id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    // legacy fields (variants/addOn) – giữ optional để không làm hỏng client cũ
    sku: z.string().trim().optional(),
    addOn: z.any().optional()
  })).min(1),
  paymentMethod: z.enum(['cod', 'payos']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional()
})

export const cartItemUpsertSchema = z.object({
  productId: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
  // legacy fields
  sku: z.string().trim().optional(),
  addOn: z.any().optional()
}).refine((v) => v.productId != null || v.id != null, { message: 'Thiếu productId' })

export const cartReplaceSchema = z.object({
  items: z.array(cartItemUpsertSchema).default([])
})

const variantSchema = z.object({
  sku: z.string().trim().min(1),
  attrs: z.object({
    weight: z.string().optional(),
    grip: z.string().optional()
  }).optional(),
  priceOverride: z.number().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  inStock: z.boolean().optional()
})

export const productUpsertSchema = z.object({
  name: z.string().trim().min(2),
  brand: z.string().trim().min(1),
  category: z.string().trim().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  image: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  discountPercent: z.number().optional(),
  sale: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  variants: z.array(variantSchema).optional(),
  stringingAddOn: z.object({
    enabled: z.boolean().optional(),
    strings: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().nonnegative()
    })).optional(),
    tension: z.object({
      minKg: z.number().nonnegative().optional(),
      maxKg: z.number().nonnegative().optional(),
      stepKg: z.number().nonnegative().optional()
    }).optional()
  }).optional()
})

export const productSuggestionsQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional()
})

