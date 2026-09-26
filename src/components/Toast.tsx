import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, key: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), t.onAction ? 5000 : 2600)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.key}>
            <span>{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                {toast.actionLabel ?? 'Deshacer'}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
