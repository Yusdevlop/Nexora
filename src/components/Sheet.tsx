import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Alt tərəfdən açılan panel. Başlıq zolağından aşağı çəkməklə bağlanır. */
export function Sheet({ open, onClose, title, children }: Props) {
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="sheet-root">
      <div className="backdrop" onClick={onClose} />
      <div
        className={`sheet${dragging ? ' dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
      >
        <div
          className="sheet-head"
          onPointerDown={(e) => {
            startY.current = e.clientY
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => dragging && setDy(Math.max(0, e.clientY - startY.current))}
          onPointerUp={() => {
            setDragging(false)
            if (dy > 100) onClose()
            setDy(0)
          }}
          onPointerCancel={() => {
            setDragging(false)
            setDy(0)
          }}
        >
          <span className="grip" />
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Bağla">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
