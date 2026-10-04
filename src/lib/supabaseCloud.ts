import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cloud } from './cloud'
import { decryptJSON, encryptJSON } from './crypto'
import { normalize } from './storage'
import type { AppData, Category, Settings, Transaction } from './types'

/**
 * Guardado en Supabase: tablas `settings`, `categories` y `transactions`
 * (ver supabase/schema.sql). Igual que en la nube de claude.ai, se sube solo
 * lo que cambió, agrupando ráfagas de cambios en una sola pasada.
 *
 * Todo el contenido viaja cifrado en la columna `payload` con la llave del usuario
 * (ver crypto.ts). En la base solo quedan a la vista el id de cada fila, su orden y
 * cuándo se creó o modificó.
 */

// ---------- Filas de la base ----------

/** Columnas en texto plano: solo existen en datos anteriores al cifrado. */
const PLAIN_SETTINGS = { opening_balance: null, monthly_budget: null, theme: null, theme_chosen: null, onboarded: null }
const PLAIN_CATEGORY = { name: null, icon: null, color: null, kind: null, budget: null, archived: null }
const PLAIN_TX = { type: null, amount: null, category_id: null, note: null, date: null }

export interface SettingsRow {
  user_id: string
  payload: string | null
  opening_balance?: number | null
  monthly_budget?: number | null
  theme?: string | null
  theme_chosen?: boolean | null
  onboarded?: boolean | null
}

export interface CategoryRow {
  user_id: string
  id: string
  position: number
  payload: string | null
  name?: string | null
  icon?: string | null
  color?: string | null
  kind?: string | null
  budget?: number | null
  archived?: boolean | null
}

export interface TransactionRow {
  user_id: string
  id: string
  created_ms: number
  payload: string | null
  type?: string | null
  amount?: number | null
  category_id?: string | null
  note?: string | null
  date?: string | null
}

/** Contexto autenticado de cada registro cifrado: no se puede copiar a otra fila u otro usuario. */
const ctx = {
  settings: (uid: string) => `settings:${uid}`,
  category: (uid: string, id: string) => `categories:${uid}:${id}`,
  tx: (uid: string, id: string) => `transactions:${uid}:${id}`,
}

export async function settingsToRow(key: CryptoKey, userId: string, s: Settings): Promise<SettingsRow> {
  return { user_id: userId, payload: await encryptJSON(key, s, ctx.settings(userId)), ...PLAIN_SETTINGS }
}

export async function categoryToRow(key: CryptoKey, userId: string, c: Category, position: number): Promise<CategoryRow> {
  const { id, ...rest } = c
  return { user_id: userId, id, position, payload: await encryptJSON(key, rest, ctx.category(userId, id)), ...PLAIN_CATEGORY }
}

export async function txToRow(key: CryptoKey, userId: string, t: Transaction): Promise<TransactionRow> {
  const { id, createdAt, ...rest } = t
  return {
    user_id: userId,
    id,
    created_ms: createdAt,
    payload: await encryptJSON(key, rest, ctx.tx(userId, id)),
    ...PLAIN_TX,
  }
}

// Lectura: filas cifradas, o en texto plano si son anteriores al cifrado.

export async function rowToSettings(key: CryptoKey, r: SettingsRow): Promise<unknown> {
  if (r.payload) return decryptJSON(key, r.payload, ctx.settings(r.user_id))
  return {
    openingBalance: Number(r.opening_balance ?? 0),
    monthlyBudget: r.monthly_budget == null ? null : Number(r.monthly_budget),
    theme: r.theme,
    themeChosen: r.theme_chosen,
    onboarded: r.onboarded,
  }
}

export async function rowToCategory(key: CryptoKey, r: CategoryRow): Promise<unknown> {
  if (r.payload) return { id: r.id, ...(await decryptJSON<object>(key, r.payload, ctx.category(r.user_id, r.id))) }
  return { id: r.id, name: r.name, icon: r.icon, color: r.color, kind: r.kind, budget: Number(r.budget ?? 0), archived: r.archived }
}

export async function rowToTx(key: CryptoKey, r: TransactionRow): Promise<unknown> {
  const createdAt = Number(r.created_ms)
  if (r.payload) return { id: r.id, createdAt, ...(await decryptJSON<object>(key, r.payload, ctx.tx(r.user_id, r.id))) }
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    categoryId: r.category_id ?? null,
    note: r.note ?? '',
    date: r.date,
    createdAt,
  }
}

// ---------- Qué cambió entre dos estados ----------

export interface Changes {
  settings: Settings | null
  /** Todas las categorías con su posición (son pocas), o null si no cambiaron. */
  categories: Category[] | null
  deletedCategories: string[]
  upsertTx: Transaction[]
  deletedTx: string[]
}

/** Compara por referencia: el reducer crea objetos nuevos solo para lo que cambió. */
export function diffData(prev: AppData, next: AppData): Changes {
  const changes: Changes = {
    settings: prev.settings !== next.settings ? next.settings : null,
    categories: null,
    deletedCategories: [],
    upsertTx: [],
    deletedTx: [],
  }
  if (prev.categories !== next.categories) {
    changes.categories = next.categories
    const keep = new Set(next.categories.map((c) => c.id))
    changes.deletedCategories = prev.categories.filter((c) => !keep.has(c.id)).map((c) => c.id)
  }
  if (prev.transactions !== next.transactions) {
    const before = new Map(prev.transactions.map((t) => [t.id, t]))
    const after = new Set(next.transactions.map((t) => t.id))
    changes.upsertTx = next.transactions.filter((t) => before.get(t.id) !== t)
    changes.deletedTx = prev.transactions.filter((t) => !after.has(t.id)).map((t) => t.id)
  }
  return changes
}

export const isEmpty = (c: Changes) =>
  !c.settings && !c.categories && !c.deletedCategories.length && !c.upsertTx.length && !c.deletedTx.length

// ---------- Conexión ----------

const PAGE = 1000
const CHUNK = 500

const chunks = <T,>(list: T[]) => Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK))

function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error
  return res
}

export function supabaseCloud(sb: SupabaseClient, userId: string, key: CryptoKey, onIdle: () => void): Cloud {
  /** Estado que ya está guardado en Supabase. */
  let base: AppData | null = null
  /** Estado más reciente de la app. */
  let latest: AppData | null = null
  let running: Promise<void> | null = null
  let timer: number | undefined
  let retry: number | undefined
  /** La última carga encontró filas en texto plano: hay que subir todo cifrado. */
  let plaintextFound = false

  async function apply(c: Changes) {
    if (c.settings) {
      check(await sb.from('settings').upsert(await settingsToRow(key, userId, c.settings), { onConflict: 'user_id' }))
    }
    if (c.categories?.length) {
      const rows = await Promise.all(c.categories.map((cat, i) => categoryToRow(key, userId, cat, i)))
      check(await sb.from('categories').upsert(rows, { onConflict: 'user_id,id' }))
    }
    for (const ids of chunks(c.deletedCategories)) {
      check(await sb.from('categories').delete().eq('user_id', userId).in('id', ids))
    }
    for (const list of chunks(c.upsertTx)) {
      const rows = await Promise.all(list.map((t) => txToRow(key, userId, t)))
      check(await sb.from('transactions').upsert(rows, { onConflict: 'user_id,id' }))
    }
    for (const ids of chunks(c.deletedTx)) {
      check(await sb.from('transactions').delete().eq('user_id', userId).in('id', ids))
    }
  }

  async function drain() {
    while (base && latest && base !== latest) {
      const target = latest
      const changes = diffData(base, target)
      if (!isEmpty(changes)) await apply(changes)
      base = target
    }
  }

  function run(): Promise<void> {
    window.clearTimeout(retry)
    running ??= drain().then(
      () => {
        running = null
        onIdle()
      },
      () => {
        // Sin conexión u otro error: se reintenta solo; los datos siguen en el dispositivo.
        running = null
        retry = window.setTimeout(run, 8000)
      },
    )
    return running
  }

  return {
    async load() {
      const s = check(await sb.from('settings').select('*').eq('user_id', userId).limit(1))
      const settingsRow = (s.data as SettingsRow[] | null)?.[0]
      if (!settingsRow) return null

      const cats = check(await sb.from('categories').select('*').eq('user_id', userId).order('position'))
      const txRows: TransactionRow[] = []
      for (let from = 0; ; from += PAGE) {
        const page = check(
          await sb
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_ms')
            .order('id')
            .range(from, from + PAGE - 1),
        )
        const rows = (page.data ?? []) as TransactionRow[]
        txRows.push(...rows)
        if (rows.length < PAGE) break
      }
      const catRows = (cats.data ?? []) as CategoryRow[]

      const [settings, categories, transactions] = await Promise.all([
        rowToSettings(key, settingsRow),
        Promise.all(catRows.map((r) => rowToCategory(key, r))),
        Promise.all(txRows.map((r) => rowToTx(key, r))),
      ])
      const data = normalize({ settings, categories, transactions })

      plaintextFound = !settingsRow.payload || catRows.some((r) => !r.payload) || txRows.some((r) => !r.payload)
      // Con datos en texto plano, la próxima subida reescribe todo cifrado.
      base = latest = plaintextFound ? null : data
      return data
    },

    save(prev, next) {
      base ??= prev
      latest = next
      window.clearTimeout(timer)
      timer = window.setTimeout(run, 400)
    },

    async flush() {
      window.clearTimeout(timer)
      if (base !== latest) await run().catch(() => undefined)
      else await running
    },

    hasPendingWrites: () => base !== latest || running !== null,

    needsFullUpload: () => plaintextFound,
  }
}
