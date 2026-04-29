export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (err) {
    const first = err?.errors?.[0]
    const msg = first?.message || err?.message || 'Payload không hợp lệ'
    res.status(400).json({ error: msg })
  }
}

