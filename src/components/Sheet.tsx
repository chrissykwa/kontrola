import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Panel inferior (bottom sheet) basado en <dialog>: trae foco atrapado,
 * cierre con Escape y fondo inerte sin código extra.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() enfoca el primer botón; si el contenido pide foco (ej: el monto), se lo damos.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
      document.documentElement.classList.add('no-scroll')
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => document.documentElement.classList.remove('no-scroll')
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Clic en el fondo oscuro (fuera del panel) cierra.
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet__panel">
          <div className="sheet__handle" aria-hidden="true" />
          <header className="sheet__header">
            <h2 id="sheet-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </header>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  )
}
