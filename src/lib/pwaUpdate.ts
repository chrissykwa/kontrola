/**
 * Aplica las versiones nuevas sin que haya que cerrar la app a mano.
 *
 * En iPhone, la app de pantalla de inicio casi nunca se "cierra": al volver a ella se
 * reanuda la versión que estaba en memoria. Por eso se busca una versión nueva al abrir
 * y cada vez que la app vuelve a primer plano, y cuando el service worker nuevo toma el
 * control se recarga la página (si hay un formulario abierto, se espera a que pase a
 * segundo plano para no perder lo que se estaba escribiendo).
 */

/** `updating`: se está descargando una versión nueva y la app se recargará sola. */
export type UpdateStatus = 'idle' | 'updating'

const JUST_UPDATED_KEY = 'kontrola:recien-actualizada'
/** Si un update dura más que esto (sin red, falló la descarga), se deja de esperar. */
const UPDATING_GIVE_UP_MS = 15_000

let status: UpdateStatus = 'idle'
let giveUpTimer: number | undefined
const listeners = new Set<() => void>()

function setStatus(next: UpdateStatus) {
  if (status === next) return
  status = next
  window.clearTimeout(giveUpTimer)
  if (next === 'updating') giveUpTimer = window.setTimeout(() => setStatus('idle'), UPDATING_GIVE_UP_MS)
  listeners.forEach((l) => l())
}

export const getUpdateStatus = () => status

export function subscribeUpdateStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** true si esta carga viene de una recarga por versión nueva (se lee una sola vez, al iniciar). */
export const launchedAfterUpdate = (() => {
  try {
    const v = sessionStorage.getItem(JUST_UPDATED_KEY) === '1'
    sessionStorage.removeItem(JUST_UPDATED_KEY)
    return v
  } catch {
    return false
  }
})()

const hasOpenForm = () => document.querySelector('dialog[open]') !== null

/** Marca que hay una versión nueva en camino (solo si no interrumpe un formulario abierto). */
function announceUpdate(worker: ServiceWorker | null) {
  if (!navigator.serviceWorker.controller || hasOpenForm()) return
  setStatus('updating')
  worker?.addEventListener('statechange', () => {
    if (worker.state === 'redundant') setStatus('idle')
  })
}

/**
 * Busca una versión nueva. Resuelve `true` si encontró una (la app se recargará sola
 * en cuanto termine de descargarse) y `false` si ya está al día.
 */
export async function checkForUpdate(): Promise<boolean> {
  // Sin controlador = primera visita (o sin service worker): no hay "versión anterior".
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  await reg.update()
  const incoming = reg.installing ?? reg.waiting
  if (incoming) announceUpdate(incoming)
  return incoming !== null
}

export function keepAppUpdated() {
  if (!('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  let hadController = Boolean(sw.controller)
  let reloading = false

  const reload = () => {
    if (reloading) return
    reloading = true
    try {
      sessionStorage.setItem(JUST_UPDATED_KEY, '1')
    } catch {
      // Sin sessionStorage solo se pierde el aviso "se actualizó".
    }
    window.location.reload()
  }

  sw.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (document.visibilityState === 'hidden' || !hasOpenForm()) {
      reload()
      return
    }
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && reload())
  })

  // El navegador también busca versiones nuevas por su cuenta: se avisa igual.
  void sw.ready.then((reg) => reg.addEventListener('updatefound', () => announceUpdate(reg.installing)))

  const check = () => {
    checkForUpdate().catch(() => {
      // Sin conexión: se vuelve a intentar la próxima vez.
    })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  window.setInterval(check, 30 * 60 * 1000)
}
