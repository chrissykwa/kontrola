import { daysInMonth, monthKeyOf, shiftMonth, type MonthKey } from './dates'
import type { AppData, Category, Transaction } from './types'

/** Efecto de un movimiento sobre el saldo. */
export function signedAmount(t: Transaction): number {
  return t.type === 'expense' ? -t.amount : t.amount
}

export function currentBalance(data: AppData): number {
  return data.transactions.reduce((acc, t) => acc + signedAmount(t), data.settings.openingBalance)
}

export function transactionsOfMonth(data: AppData, key: MonthKey): Transaction[] {
  return data.transactions.filter((t) => monthKeyOf(t.date) === key)
}

export interface MonthSummary {
  spent: number
  income: number
  /** Gasto por categoría (solo gastos). */
  byCategory: Map<string, number>
  /** Gasto por día; índice 0 = día 1. */
  daily: number[]
  expenseCount: number
}

export function monthSummary(data: AppData, key: MonthKey): MonthSummary {
  const daily = new Array<number>(daysInMonth(key)).fill(0)
  const byCategory = new Map<string, number>()
  let spent = 0
  let income = 0
  let expenseCount = 0
  for (const t of transactionsOfMonth(data, key)) {
    if (t.type === 'expense') {
      spent += t.amount
      expenseCount++
      daily[Number(t.date.slice(8, 10)) - 1] += t.amount
      const cat = t.categoryId ?? 'otros'
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + t.amount)
    } else if (t.type === 'income') {
      income += t.amount
    }
  }
  return { spent, income, byCategory, daily, expenseCount }
}

export function expenseCategories(data: AppData, includeArchived = false): Category[] {
  return data.categories.filter((c) => c.kind === 'expense' && (includeArchived || !c.archived))
}

export function incomeCategories(data: AppData): Category[] {
  return data.categories.filter((c) => c.kind === 'income' && !c.archived)
}

export function categoryBudgetSum(data: AppData): number {
  return expenseCategories(data).reduce((acc, c) => acc + c.budget, 0)
}

/** Presupuesto mensual efectivo: el total definido, o la suma por categoría. 0 = sin presupuesto. */
export function totalBudget(data: AppData): number {
  return data.settings.monthlyBudget ?? categoryBudgetSum(data)
}

export interface Pace {
  budget: number
  spent: number
  remaining: number
  /** Días que quedan en el mes contando hoy. */
  daysLeft: number
  /** Cuánto puedes gastar por día para terminar el mes dentro del presupuesto. */
  perDay: number
  /** Cuánto "debería" llevar gastado a esta altura si gastara parejo. */
  expectedByNow: number
  status: 'none' | 'ok' | 'warning' | 'over'
}

/** Ritmo de gasto del mes. `todayISO` se inyecta para poder testear. */
export function monthPace(data: AppData, key: MonthKey, todayISO: string): Pace {
  const budget = totalBudget(data)
  const { spent } = monthSummary(data, key)
  const days = daysInMonth(key)
  const todayKey = monthKeyOf(todayISO)
  const dayOfMonth = todayKey === key ? Number(todayISO.slice(8, 10)) : todayKey > key ? days : 0
  const daysLeft = Math.max(0, days - dayOfMonth + (todayKey === key ? 1 : 0))
  const remaining = budget - spent
  const perDay = daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0
  const expectedByNow = (budget * dayOfMonth) / days
  let status: Pace['status'] = 'none'
  if (budget > 0) {
    if (spent > budget) status = 'over'
    else if (spent >= budget * 0.85 || (dayOfMonth > 0 && spent > expectedByNow * 1.1)) status = 'warning'
    else status = 'ok'
  }
  return { budget, spent, remaining, daysLeft, perDay, expectedByNow, status }
}

export function budgetStatus(spent: number, budget: number): 'none' | 'ok' | 'warning' | 'over' {
  if (budget <= 0) return 'none'
  if (spent > budget) return 'over'
  if (spent >= budget * 0.85) return 'warning'
  return 'ok'
}

/** Gasto total de los últimos `n` meses terminando en `key` (el más antiguo primero). */
export function monthlyTotals(data: AppData, key: MonthKey, n: number): { key: MonthKey; spent: number }[] {
  const totals = new Map<MonthKey, number>()
  for (const t of data.transactions) {
    if (t.type !== 'expense') continue
    const k = monthKeyOf(t.date)
    totals.set(k, (totals.get(k) ?? 0) + t.amount)
  }
  return Array.from({ length: n }, (_, i) => {
    const k = shiftMonth(key, i - (n - 1))
    return { key: k, spent: totals.get(k) ?? 0 }
  })
}

export interface Suggestion {
  note: string
  categoryId: string | null
  type: Transaction['type']
  amount: number
  count: number
}

/**
 * Detalles usados antes, para autocompletar: escribes "chicle" y la app recuerda
 * la categoría y el último monto. Ordenados por frecuencia y luego por recencia.
 */
export function noteSuggestions(data: AppData): Suggestion[] {
  const byNote = new Map<string, Suggestion & { last: string }>()
  for (const t of data.transactions) {
    const note = t.note.trim()
    if (!note || t.type === 'adjustment') continue
    const k = note.toLocaleLowerCase('es')
    const prev = byNote.get(k)
    // Orden cronológico: fecha del movimiento y, si empatan, cuándo se registró.
    const stamp = `${t.date}|${String(t.createdAt).padStart(15, '0')}`
    if (!prev) {
      byNote.set(k, { note, categoryId: t.categoryId, type: t.type, amount: t.amount, count: 1, last: stamp })
    } else {
      prev.count++
      if (stamp >= prev.last) {
        Object.assign(prev, { note, categoryId: t.categoryId, type: t.type, amount: t.amount, last: stamp })
      }
    }
  }
  return [...byNote.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .map(({ last: _last, ...s }) => s)
}
