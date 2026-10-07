import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

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
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() enfoca el primer botón; si el contenido pide foco (ej: el monto), se lo damos.
      // Sin desplazar: de ubicar el panel sobre el teclado se encarga useKeyboardInset.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
      document.documentElement.classList.add('no-scroll')
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => document.documentElement.classList.remove('no-scroll')
  }, [open])

  useKeyboardInset(ref, open)

  // Al cambiar de contenido (ej. de una categoría a editar un gasto) se parte desde arriba.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [title])

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
          <div className="sheet__body" ref={bodyRef}>
            {children}
          </div>
        </div>
      )}
    </dialog>
  )
}

/**
 * En iPhone el teclado no achica la pantalla: se dibuja encima. Y si el foco llega
 * mientras el panel todavía está entrando (animación), Safari no lo sube y el teclado
 * lo tapa. Aquí se mide lo que el teclado ocupa (visualViewport) y se sube el panel
 * justo esa distancia (`--kb`), además de limitar su alto a lo que queda visible (`--vvh`).
 */
function useKeyboardInset(ref: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const vv = window.visualViewport
    const dialog = ref.current
    if (!open || !vv || !dialog) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const covered = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
        dialog.style.setProperty('--kb', `${Math.round(covered)}px`)
        dialog.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
        // Con el panel ya acomodado, el campo donde se escribe no puede quedar fuera de vista.
        frame = requestAnimationFrame(() => keepFocusVisible(dialog))
      })
    }
    measure()
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', measure)
      vv.removeEventListener('scroll', measure)
      dialog.style.removeProperty('--kb')
      dialog.style.removeProperty('--vvh')
    }
  }, [ref, open])
}

/** Desplaza el contenido del panel lo justo para que el campo con foco se vea (sobre el botón fijo de abajo). */
function keepFocusVisible(dialog: HTMLDialogElement) {
  const el = document.activeElement
  const body = dialog.querySelector<HTMLElement>('.sheet__body')
  if (!(el instanceof HTMLElement) || !body || !body.contains(el)) return
  const footer = body.querySelector<HTMLElement>('.form__actions')
  const field = el.getBoundingClientRect()
  const view = body.getBoundingClientRect()
  const bottom = view.bottom - (footer && !footer.contains(el) ? footer.offsetHeight : 0) - 8
  if (field.bottom > bottom) body.scrollTop += field.bottom - bottom
  else if (field.top < view.top + 8) body.scrollTop -= view.top + 8 - field.top
}
