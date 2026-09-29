import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Kind = 'info' | 'success' | 'error' | 'live'
interface ToastItem {
  id: number
  text: string
  kind: Kind
}

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const push = useCallback((text: string, kind: Kind = 'info') => {
    const id = ++seq.current
    setItems((prev) => [...prev.slice(-2), { id, text, kind }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 3600)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'live' && <span className="live-dot" aria-hidden />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
