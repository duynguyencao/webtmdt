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
    district: z.string().optional(),
    ward: z.string().optional()
  }),
  items: z.array(z.object({
    id: z.number().int().positive(),
    sku: z.string().trim().optional(),
    quantity: z.number().int().positive(),
    addOn: z.object({
      stringId: z.string().trim().min(1),
      tensionKg: z.number().positive()
    }).optional()
  })).min(1),
  paymentMethod: z.enum(['cod', 'payos']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional()
})

