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
  })).min(1),
  paymentMethod: z.enum(['cod', 'payos']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional()
})

export const cartItemUpsertSchema = z.object({
  productId: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  quantity: z.number().int().positive()
}).refine((v) => v.productId != null || v.id != null, { message: 'Thiếu productId' })

export const cartReplaceSchema = z.object({
  items: z.array(cartItemUpsertSchema).default([])
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
  stock: z.number().int().min(0).optional()
})

export const productSuggestionsQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional()
})

