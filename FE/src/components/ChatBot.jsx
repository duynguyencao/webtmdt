import React, { useState, useRef, useEffect } from 'react'
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi'
import { api } from '../api/client'
import './ChatBot.css'

const ChatBot = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Tôi là trợ lý ShopTD. Bạn có thể hỏi tôi về sản phẩm, gợi ý vợt/giày cho người mới, hoặc so sánh sản phẩm.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const onOpenChat = () => setOpen(true)
    window.addEventListener('openChat', onOpenChat)
    return () => window.removeEventListener('openChat', onOpenChat)
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      // Gửi lịch sử tin nhắn trước (bỏ tin chào đầu) để bot nhớ cuộc hội thoại
      const history = messages.slice(1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }))
      const { reply } = await api.postChat(text, history)
      setMessages((prev) => [...prev, { role: 'bot', text: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: err.message || 'Không gửi được tin nhắn. Vui lòng thử lại.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`chatbot-toggle ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Đóng chat' : 'Mở chat'}
      >
        {open ? <FiX /> : <FiMessageCircle />}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <span className="chatbot-title">Trợ lý ShopTD</span>
            <button type="button" className="chatbot-close" onClick={() => setOpen(false)} aria-label="Đóng">
              <FiX />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-message chatbot-message-${msg.role}`}>
                <span className="chatbot-message-text">{msg.text}</span>
              </div>
            ))}
            {loading && (
              <div className="chatbot-message chatbot-message-bot">
                <span className="chatbot-typing">Đang suy nghĩ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-form" onSubmit={handleSend}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              maxLength={1000}
            />
            <button type="submit" className="chatbot-send" disabled={loading || !input.trim()} aria-label="Gửi">
              <FiSend />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default ChatBot
