import React, { useEffect, useMemo, useRef, useState } from 'react'
import './SearchableSelect.css'

export default function SearchableSelect({
  label,
  placeholder = 'Chọn...',
  value,
  options = [],
  disabled = false,
  required = false,
  onChange
}) {
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const selected = useMemo(() => options.find((o) => String(o.value) === String(value)) || null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => String(o.label || '').toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open, options.length])

  const commit = (opt) => {
    if (!opt) return
    onChange?.(opt.value, opt)
    setOpen(false)
  }

  return (
    <div className={`ss ${disabled ? 'ss-disabled' : ''}`} ref={wrapRef}>
      {label && <label className="ss-label">{label}{required ? ' *' : ''}</label>}
      <div
        className={`ss-control ${open ? 'ss-open' : ''}`}
        onClick={() => {
          if (disabled) return
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        role="combobox"
        aria-expanded={open}
      >
        <input
          ref={inputRef}
          className="ss-input"
          disabled={disabled}
          value={open ? query : (selected?.label || '')}
          placeholder={selected ? selected.label : placeholder}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
              setOpen(true)
              return
            }
            if (!open) return
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(0, i - 1))
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(filtered[activeIndex])
            }
          }}
        />
        <span className="ss-chevron" aria-hidden="true">▾</span>
      </div>

      {open && !disabled && (
        <div className="ss-menu" role="listbox">
          {filtered.length === 0 ? (
            <div className="ss-empty">Không có kết quả</div>
          ) : (
            filtered.slice(0, 60).map((opt, idx) => (
              <button
                type="button"
                key={String(opt.value)}
                className={`ss-option ${idx === activeIndex ? 'active' : ''} ${String(opt.value) === String(value) ? 'selected' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => commit(opt)}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

