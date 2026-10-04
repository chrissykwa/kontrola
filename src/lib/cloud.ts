import { monthKeyOf } from './dates'
import { normalize } from './storage'
import type { AppData, Transaction } from './types'

/**
 * Guardado en la nube cuando Kontrola corre dentro de claude.ai (página publicada).
 *
 * Los datos quedan en el espacio privado de tu cuenta (`data/users/<tu id>/`),
 * así los ves desde cualquier dispositivo donde abras el enlace con tu sesión.
 * Nadie más puede leerlos, ni siquiera alguien con quien compartas la página.
 *
 * Estructura (pocos documentos, lejos del límite de 5.000):
 *   data/users/<id>/profile          → { settings, categories }
 *   data/users/<id>/profile/months/<YYYY-MM> → { tx: Transaction[] }
 */

interface DocSnap {
  exists: boolean
  id: string
  data(): Record<string, unknown> | undefined
}
interface DocRef {
  get(): Promise<DocSnap>
  set(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  collection(path: string): CollRef
}
interface CollRef {
  doc(id: string): DocRef
  get(): Promise<{ docs: DocSnap[] }>
}
interface HostDB {
  doc(path: string): DocRef
}
interface HostUser {
  id(): Promise<string | null>
}
type HostClaude = { use?: (name: string) => Promise<unknown> }

export interface Cloud {
  load(): Promise<AppData | null>
  /** Guarda solo lo que cambió entre `prev` y `next`. */
  save(prev: AppData, next: AppData): void
  /** Espera a que terminen las escrituras pendientes. */
  flush(): Promise<void>
  hasPendingWrites(): boolean
  /** La nube tiene datos en un formato antiguo: hay que volver a subirlos completos. */
  needsFullUpload?(): boolean
}

async function use<T>(name: string): Promise<T | null> {
  const host = (window as { claude?: HostClaude }).claude
  if (typeof host?.use !== 'function') return null
  try {
    return ((await host.use(name)) as T | null) ?? null
  } catch {
    return null
  }
}

/** Conecta con el almacenamiento de la cuenta de claude.ai. `onIdle` avisa cuando todo quedó guardado. */
export async function connectClaudeCloud(onIdle: () => void): Promise<Cloud | null> {
  const [db, user] = await Promise.all([use<HostDB>('db'), use<HostUser>('user')])
  if (!db || !user) return null
  const uid = await user.id().catch(() => null)
  if (!uid) return null

  const profile = db.doc(`data/users/${uid}/profile`)
  const months = profile.collection('months')

  // Cola de escrituras: una a la vez y siempre con el estado más reciente de cada documento.
  const dirty = new Map<string, () => Promise<void>>()
  let running: Promise<void> | null = null
  let timer: number | undefined

  const run = async () => {
    let failed = false
    while (dirty.size) {
      const [key, write] = dirty.entries().next().value as [string, () => Promise<void>]
      dirty.delete(key)
      try {
        await write()
      } catch {
        // Un reintento corto ante fallas transitorias; si vuelve a fallar, queda en localStorage.
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 400))
        await write().catch(() => {
          failed = true
        })
      }
    }
    running = null
    if (!failed) onIdle()
  }

  const schedule = () => {
    window.clearTimeout(timer)
    // Agrupa ráfagas de cambios (ej: importar un respaldo) en una sola pasada.
    timer = window.setTimeout(() => {
      running ??= run()
    }, 300)
  }

  return {
    async load() {
      const snap = await profile.get()
      if (!snap.exists) return null
      const body = snap.data() ?? {}
      const monthDocs = await months.get()
      const transactions = monthDocs.docs.flatMap((d) => {
        const tx = d.data()?.tx
        return Array.isArray(tx) ? tx : []
      })
      return normalize({ ...body, transactions })
    },

    save(prev, next) {
      if (prev.settings !== next.settings || prev.categories !== next.categories) {
        dirty.set('profile', () => profile.set({ version: 1, settings: next.settings, categories: next.categories }))
      }
      if (prev.transactions !== next.transactions) {
        const before = groupByMonth(prev.transactions)
        const after = groupByMonth(next.transactions)
        for (const key of new Set([...before.keys(), ...after.keys()])) {
          const a = before.get(key) ?? []
          const b = after.get(key) ?? []
          if (sameList(a, b)) continue
          dirty.set(`month:${key}`, () => (b.length ? months.doc(key).set({ tx: b }) : months.doc(key).delete()))
        }
      }
      if (dirty.size) schedule()
    },

    async flush() {
      window.clearTimeout(timer)
      if (dirty.size) running ??= run()
      await running
    },

    hasPendingWrites: () => dirty.size > 0 || running !== null,
  }
}

function groupByMonth(txs: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    const k = monthKeyOf(t.date)
    const list = map.get(k)
    if (list) list.push(t)
    else map.set(k, [t])
  }
  return map
}

/** Compara por referencia: el reducer crea objetos nuevos solo para lo que cambió. */
function sameList(a: Transaction[], b: Transaction[]): boolean {
  if (a.length !== b.length) return false
  const ids = new Map(a.map((t) => [t.id, t]))
  return b.every((t) => ids.get(t.id) === t)
}
