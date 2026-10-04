import { Check } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { checkForUpdate, getUpdateStatus, launchedAfterUpdate, subscribeUpdateStatus } from '../lib/pwaUpdate'
import { useStore } from '../state/store'
import { Logo } from './Logo'

/** Tiempo para ver el logo aparecer y latir, y que se note que buscó novedades. */
const MIN_VISIBLE_MS = 3000
/** "Buscando novedades…" se muestra al menos esto, aunque la búsqueda termine antes. */
const MIN_SEARCHING_MS = 1900
/**
 * No se espera más que esto para buscar novedades (ej. con mala señal). Si la búsqueda
 * encuentra una versión nueva después, la pantalla vuelve a aparecer en "Actualizando…".
 */
const CHECK_TIMEOUT_MS = 2500
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
  const [searchShown, setSearchShown] = useState(launchedAfterUpdate)
  const [searchDone, setSearchDone] = useState(launchedAfterUpdate)
  const [phase, setPhase] = useState<'shown' | 'leaving' | 'gone'>('shown')

  useEffect(() => {
    const min = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    if (launchedAfterUpdate) return () => window.clearTimeout(min)
    const shown = window.setTimeout(() => setSearchShown(true), MIN_SEARCHING_MS)
    const giveUp = window.setTimeout(() => setSearchDone(true), CHECK_TIMEOUT_MS)
    checkForUpdate()
      .catch(() => false)
      .then(() => setSearchDone(true))
    return () => {
      window.clearTimeout(min)
      window.clearTimeout(shown)
      window.clearTimeout(giveUp)
    }
  }, [])

  const checked = searchShown && searchDone

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
