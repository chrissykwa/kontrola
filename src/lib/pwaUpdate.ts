/**
 * Aplica las versiones nuevas sin que haya que cerrar la app a mano.
 *
 * En iPhone, la app de pantalla de inicio casi nunca se "cierra": al volver a ella se
 * reanuda la versión que estaba en memoria. Por eso se busca una versión nueva cada vez
 * que la app vuelve a primer plano, y cuando el service worker nuevo toma el control
 * se recarga la página (si hay un formulario abierto, se espera a que pase a segundo plano).
 */
export function keepAppUpdated() {
  if (!('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  // Sin controlador = primera visita: el service worker recién instalado no es una "versión nueva".
  let hadController = Boolean(sw.controller)
  let reloading = false

  const reload = () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }

  sw.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (document.visibilityState === 'hidden' || !document.querySelector('dialog[open]')) {
      reload()
      return
    }
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && reload())
  })

  const checkForUpdate = () => {
    sw.getRegistration()
      .then((r) => r?.update())
      .catch(() => {
        // Sin conexión: se vuelve a intentar la próxima vez.
      })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.setInterval(checkForUpdate, 30 * 60 * 1000)
}
