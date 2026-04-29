import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

const email = String(process.argv[2] || '').trim().toLowerCase()
const password = String(process.argv[3] || '').trim()
const name = String(process.argv[4] || 'Admin').trim()

if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email> [password] [name]')
  process.exit(1)
}

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error('Missing MONGODB_URI in .env')
  process.exit(1)
}

await mongoose.connect(mongoUri)

let user = await User.findOne({ email })
if (!user) {
  if (!password) {
    console.error('User not found. Provide password to create new admin user.')
    process.exit(1)
  }
  user = await User.create({
    name,
    email,
    password,
    role: 'admin',
    emailVerified: true
  })
  console.log('Created admin user:', email)
} else {
  user.role = 'admin'
  user.emailVerified = true
  if (password) user.password = password
  await user.save()
  console.log('Updated user to admin:', email, password ? '(password reset)' : '')
}

await mongoose.disconnect()
process.exit(0)

