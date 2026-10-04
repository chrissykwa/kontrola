import { Check } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { checkForUpdate, getUpdateStatus, launchedAfterUpdate, subscribeUpdateStatus } from '../lib/pwaUpdate'
import { useStore } from '../state/store'
import { Logo } from './Logo'

/** Lo justo para ver el logo aparecer y "respirar" una vez, sin hacer esperar. */
const MIN_VISIBLE_MS = 1100
/**
 * No se espera más que esto para buscar novedades (ej. con mala señal). Si la búsqueda
 * encuentra una versión nueva después, la pantalla vuelve a aparecer en "Actualizando…".
 */
const CHECK_TIMEOUT_MS = 1500
const LEAVE_MS = 350

/**
 * Pantalla de apertura: el logo aparece y late mientras se cargan los datos y se buscan
 * novedades. Si hay una versión nueva, se queda en "Actualizando…" hasta que la app se
 * recarga sola. También reaparece si se encuentra una versión nueva al volver a la app.
 */
export function LaunchSplash() {
  const { ready } = useStore()
  const updateStatus = useSyncExternalStore(subscribeUpdateStatus, getUpdateStatus)
  const [minElapsed, setMinElapsed] = useState(false)
  const [checked, setChecked] = useState(launchedAfterUpdate)
  const [phase, setPhase] = useState<'shown' | 'leaving' | 'gone'>('shown')

  useEffect(() => {
    const min = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    if (launchedAfterUpdate) return () => window.clearTimeout(min)
    const giveUp = window.setTimeout(() => setChecked(true), CHECK_TIMEOUT_MS)
    checkForUpdate()
      .catch(() => false)
      .then(() => setChecked(true))
    return () => {
      window.clearTimeout(min)
      window.clearTimeout(giveUp)
    }
  }, [])

  const updating = updateStatus === 'updating'
  const done = ready && minElapsed && checked && !updating

  useEffect(() => {
    if (done && phase === 'shown') setPhase('leaving')
  }, [done, phase])

  useEffect(() => {
    if (phase !== 'leaving') return
    const t = window.setTimeout(() => setPhase('gone'), LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  if (phase === 'gone' && !updating) return null

  const message = updating
    ? 'Actualizando Kontrola…'
    : launchedAfterUpdate
      ? 'Listo, tienes la última versión'
      : !checked
        ? 'Buscando novedades…'
        : !ready
          ? 'Cargando tus datos…'
          : 'Todo al día'
  const settled = !updating && checked && ready

  return (
    <div className={`launch ${phase === 'leaving' && !updating ? 'is-leaving' : ''}`} role="status" aria-live="polite">
      <Logo size={76} label="Kontrola" />
      <p className="launch__status" key={message}>
        {settled && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}
        {message}
      </p>
      <span className={`launch__bar ${settled ? 'is-done' : ''}`} aria-hidden="true" />
    </div>
  )
}
