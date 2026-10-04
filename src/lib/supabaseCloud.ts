import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cloud } from './cloud'
import { normalize } from './storage'
import type { AppData, Category, Settings, Transaction } from './types'

/**
 * Guardado en Supabase: tablas `settings`, `categories` y `transactions`
 * (ver supabase/schema.sql). Igual que en la nube de claude.ai, se sube solo
 * lo que cambió, agrupando ráfagas de cambios en una sola pasada.
 */

// ---------- Conversión entre la app y las filas de la base ----------

export interface SettingsRow {
  user_id: string
  opening_balance: number
  monthly_budget: number | null
  theme: string
  theme_chosen: boolean
  onboarded: boolean
}

export interface CategoryRow {
  user_id: string
  id: string
  name: string
  icon: string
  color: string
  kind: string
  budget: number
  archived: boolean
  position: number
}

export interface TransactionRow {
  user_id: string
  id: string
  type: string
  amount: number
  category_id: string | null
  note: string
  date: string
  created_ms: number
}

export const settingsToRow = (userId: string, s: Settings): SettingsRow => ({
  user_id: userId,
  opening_balance: s.openingBalance,
  monthly_budget: s.monthlyBudget,
  theme: s.theme,
  theme_chosen: s.themeChosen === true,
  onboarded: s.onboarded,
})

export const rowToSettings = (r: SettingsRow) => ({
  openingBalance: Number(r.opening_balance),
  monthlyBudget: r.monthly_budget == null ? null : Number(r.monthly_budget),
  theme: r.theme,
  themeChosen: r.theme_chosen,
  onboarded: r.onboarded,
})

export const categoryToRow = (userId: string, c: Category, position: number): CategoryRow => ({
  user_id: userId,
  id: c.id,
  name: c.name,
  icon: c.icon,
  color: c.color,
  kind: c.kind,
  budget: c.budget,
  archived: c.archived === true,
  position,
})

export const rowToCategory = (r: CategoryRow) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  kind: r.kind,
  budget: Number(r.budget),
  archived: r.archived,
})

export const txToRow = (userId: string, t: Transaction): TransactionRow => ({
  user_id: userId,
  id: t.id,
  type: t.type,
  amount: t.amount,
  category_id: t.categoryId,
  note: t.note,
  date: t.date,
  created_ms: t.createdAt,
})

export const rowToTx = (r: TransactionRow) => ({
  id: r.id,
  type: r.type,
  amount: Number(r.amount),
  categoryId: r.category_id,
  note: r.note,
  date: r.date,
  createdAt: Number(r.created_ms),
})

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

export function supabaseCloud(sb: SupabaseClient, userId: string, onIdle: () => void): Cloud {
  /** Estado que ya está guardado en Supabase. */
  let base: AppData | null = null
  /** Estado más reciente de la app. */
  let latest: AppData | null = null
  let running: Promise<void> | null = null
  let timer: number | undefined
  let retry: number | undefined

  async function apply(c: Changes) {
    if (c.settings) {
      check(await sb.from('settings').upsert(settingsToRow(userId, c.settings), { onConflict: 'user_id' }))
    }
    if (c.categories?.length) {
      const rows = c.categories.map((cat, i) => categoryToRow(userId, cat, i))
      check(await sb.from('categories').upsert(rows, { onConflict: 'user_id,id' }))
    }
    for (const ids of chunks(c.deletedCategories)) {
      check(await sb.from('categories').delete().eq('user_id', userId).in('id', ids))
    }
    for (const list of chunks(c.upsertTx)) {
      check(await sb.from('transactions').upsert(list.map((t) => txToRow(userId, t)), { onConflict: 'user_id,id' }))
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
      const transactions: TransactionRow[] = []
      for (let from = 0; ; from += PAGE) {
        const page = check(
          await sb
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date')
            .order('id')
            .range(from, from + PAGE - 1),
        )
        const rows = (page.data ?? []) as TransactionRow[]
        transactions.push(...rows)
        if (rows.length < PAGE) break
      }

      const data = normalize({
        settings: rowToSettings(settingsRow),
        categories: ((cats.data ?? []) as CategoryRow[]).map(rowToCategory),
        transactions: transactions.map(rowToTx),
      })
      base = latest = data
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
  }
}
