import React from 'react'
import './NoticeToast.css'

const NoticeToast = ({ message, type = 'success' }) => {
  if (!message) return null

  return (
    <div className={`notice-toast notice-toast-${type}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}

export default NoticeToast
