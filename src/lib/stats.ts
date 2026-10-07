import { daysInMonth, monthKeyOf, shiftMonth, today, type MonthKey } from './dates'
import type { AppData, Category, MoneyAccount, Transaction } from './types'

/** Efecto de un movimiento sobre el saldo. */
export function signedAmount(t: Transaction): number {
  return t.type === 'expense' ? -t.amount : t.type === 'transfer' ? -t.amount : t.amount
}

export function currentBalance(data: AppData): number {
  return data.settings.accounts.filter((a) => a.kind === 'cash').reduce((sum, a) => sum + accountBalance(data, a.id), 0)
}

export function accountBalance(data: AppData, accountId: string): number {
  const account = data.settings.accounts.find((a) => a.id === accountId)
  if (!account) return 0
  // En tarjetas, lo que el banco cobra de más en un estado (cargos no anotados) también es deuda.
  const unlisted = account.kind === 'credit' ? cardDues(data, account).reduce((n, d) => n + d.extra, 0) : 0
  return data.transactions.reduce((sum, t) => {
    if ((t.accountId ?? 'principal') === accountId) sum += signedAmount(t)
    if (t.type === 'transfer' && t.toAccountId === accountId) sum += t.amount
    return sum
  }, account.openingBalance - unlisted)
}

const dayInMonth = (key: MonthKey, day: number) => `${key}-${String(Math.min(day, daysInMonth(key))).padStart(2, '0')}`

export function statementCycle(month: MonthKey, account: MoneyAccount): { closeDate: string; dueDate: string } {
  const override = account.cycleOverrides?.find((cycle) => cycle.month === month)
  return {
    closeDate: override?.closeDate ?? dayInMonth(month, account.closingDay ?? 25),
    dueDate: override?.dueDate ?? dayInMonth(shiftMonth(month, 1), account.dueDay ?? 10),
  }
}

/** La compra entra al cierre próximo; su pago vence el mes siguiente a ese cierre. */
export function creditCycle(date: string, account: MoneyAccount): { closeDate: string; dueDate: string } {
  const month = monthKeyOf(date)
  // El mes anterior puede cerrar en los primeros días del mes actual si el
  // banco publica un corte excepcional. Buscar en orden evita perder compras.
  for (let offset = -1; offset <= 2; offset++) {
    const cycle = statementCycle(shiftMonth(month, offset), account)
    if (date <= cycle.closeDate) return cycle
  }
  return statementCycle(shiftMonth(month, 2), account)
}

/** Una compra crea deuda completa hoy, pero se factura en cuotas mensuales. */
export function installmentSchedule(t: Transaction, account: MoneyAccount): { dueDate: string; amount: number }[] {
  const count = Math.max(1, Math.min(60, Math.round(t.installments ?? 1)))
  const firstMonth = monthKeyOf(creditCycle(t.date, account).closeDate)
  const base = Math.floor(t.amount / count)
  const remainder = t.amount % count
  return Array.from({ length: count }, (_, index) => ({
    dueDate: statementCycle(shiftMonth(firstMonth, index), account).dueDate,
    amount: base + (index < remainder ? 1 : 0),
  }))
}

/** Lo que vence en una fecha de pago de la tarjeta. */
export interface CardDue {
  dueDate: string
  /** Compras y cuotas anotadas en Kontrola que vencen ese día. */
  registered: number
  purchases: number
  /** Deuda inicial de la tarjeta (de antes de usar Kontrola), si vence ese día. */
  opening: number
  /** Total del estado de cuenta, si se anotó. */
  statement?: number
  /** Lo que el banco cobra de más respecto de lo anotado (cargos no anotados uno a uno). */
  extra: number
}

/** Vencimientos de una tarjeta: lo anotado, la deuda inicial y el total del estado si se conoce. */
export function cardDues(data: AppData, card: MoneyAccount): CardDue[] {
  const dues = new Map<string, CardDue>()
  const due = (dueDate: string) => {
    const d = dues.get(dueDate) ?? { dueDate, registered: 0, purchases: 0, opening: 0, extra: 0 }
    dues.set(dueDate, d)
    return d
  }
  if (card.openingBalance < 0) due(card.openingDueDate ?? creditCycle(today(), card).dueDate).opening = -card.openingBalance
  for (const t of data.transactions) {
    if (t.type !== 'expense' || (t.accountId ?? 'principal') !== card.id) continue
    for (const { dueDate, amount } of installmentSchedule(t, card)) {
      const d = due(dueDate)
      d.registered += amount
      d.purchases++
    }
  }
  for (const st of card.statementTotals ?? []) {
    const d = due(st.dueDate)
    d.statement = st.amount
    d.extra = Math.max(0, st.amount - d.registered - d.opening)
  }
  return [...dues.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** Compras de tarjeta agrupadas por vencimiento, menos los pagos asignados a cada ciclo. */
export function creditBills(data: AppData, accountId: string): { dueDate: string; amount: number; purchases: number }[] {
  const account = data.settings.accounts.find((a) => a.id === accountId)
  if (!account || account.kind !== 'credit') return []
  // Los pagos se aplican primero al vencimiento pendiente más antiguo.
  let paid = data.transactions.filter((t) => t.type === 'transfer' && t.toAccountId === accountId).reduce((n, t) => n + t.amount, 0)
  return cardDues(data, account).map((d) => {
    const total = d.registered + d.opening + d.extra
    const used = Math.min(paid, total)
    paid -= used
    return { dueDate: d.dueDate, amount: total - used, purchases: d.purchases }
  })
}

/**
 * Cuándo pesa un gasto en el presupuesto y en Análisis.
 * - Al contado (cuenta o efectivo): el día del gasto, por el total.
 * - Con tarjeta de crédito: el día en que vence el pago de la tarjeta, cuota a cuota
 *   (una compra del 7 oct que vence el 5 nov cuenta en noviembre; 3 cuotas = 3 meses).
 * Los pagos de la tarjeta son traspasos, así que no se cuentan de nuevo.
 */
export interface SpendEntry {
  tx: Transaction
  /** Fecha en que cuenta: la del gasto, o el vencimiento de la tarjeta. */
  date: string
  amount: number
  /** Solo con tarjeta. */
  card?: { name: string; dueDate: string; installment: number; installments: number }
  /** Cargos de la tarjeta que no están anotados uno a uno (deuda inicial o diferencia con el estado). */
  unlisted?: boolean
}

/** Prefijo de los "movimientos" que representan cargos del estado no anotados (no se pueden editar). */
export const UNLISTED_PREFIX = 'estado:'

/** Categoría donde van los cargos no anotados de una tarjeta: la elegida, una llamada "Tarjeta…", u Otros. */
export function cardChargesCategory(data: AppData, card: MoneyAccount): string {
  const expense = data.categories.filter((c) => c.kind === 'expense' && !c.archived)
  if (card.chargesCategoryId && expense.some((c) => c.id === card.chargesCategoryId)) return card.chargesCategoryId
  return expense.find((c) => /tarjeta|cr[eé]dito/i.test(c.name))?.id ?? 'otros'
}

const entriesCache = new WeakMap<AppData, SpendEntry[]>()

export function spendEntries(data: AppData): SpendEntry[] {
  const cached = entriesCache.get(data)
  if (cached) return cached
  const cards = new Map(data.settings.accounts.filter((a) => a.kind === 'credit').map((a) => [a.id, a]))
  const entries: SpendEntry[] = []
  for (const t of data.transactions) {
    if (t.type !== 'expense') continue
    const card = cards.get(t.accountId ?? 'principal')
    if (!card) {
      entries.push({ tx: t, date: t.date, amount: t.amount })
      continue
    }
    const schedule = installmentSchedule(t, card)
    schedule.forEach(({ dueDate, amount }, i) =>
      entries.push({
        tx: t,
        date: dueDate,
        amount,
        card: { name: card.name, dueDate, installment: i + 1, installments: schedule.length },
      }),
    )
  }
  for (const card of cards.values()) {
    for (const d of cardDues(data, card)) {
      const amount = d.opening + d.extra
      if (amount <= 0) continue
      entries.push({
        tx: {
          id: `${UNLISTED_PREFIX}${card.id}:${d.dueDate}`,
          type: 'expense',
          amount,
          categoryId: cardChargesCategory(data, card),
          note: 'Otros cargos del estado',
          date: d.dueDate,
          createdAt: 0,
          accountId: card.id,
        },
        date: d.dueDate,
        amount,
        card: { name: card.name, dueDate: d.dueDate, installment: 1, installments: 1 },
        unlisted: true,
      })
    }
  }
  entriesCache.set(data, entries)
  return entries
}

/** Último mes con gastos por pagar (cuotas de tarjeta que vencen más adelante), o el actual. */
export function lastSpendMonth(data: AppData, current: MonthKey): MonthKey {
  return spendEntries(data).reduce((max, e) => {
    const k = monthKeyOf(e.date)
    return k > max ? k : max
  }, current)
}

/** Gastos que cuentan en un mes (ver `spendEntries`). */
export function spendEntriesOfMonth(data: AppData, key: MonthKey): SpendEntry[] {
  return spendEntries(data).filter((e) => monthKeyOf(e.date) === key)
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
  for (const e of spendEntriesOfMonth(data, key)) {
    spent += e.amount
    expenseCount++
    daily[Number(e.date.slice(8, 10)) - 1] += e.amount
    const cat = e.tx.categoryId ?? 'otros'
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.amount)
  }
  for (const t of transactionsOfMonth(data, key)) {
    if (t.type === 'income') income += t.amount
  }
  return { spent, income, byCategory, daily, expenseCount }
}

export interface DetailGroup {
  /** Detalle tal como se escribió la última vez (o "Sin detalle"). */
  label: string
  count: number
  total: number
}

export interface CategoryBreakdown {
  /** Gastos que cuentan en el mes (con tarjeta: la cuota que vence ese mes), del más reciente al más antiguo. */
  entries: SpendEntry[]
  total: number
  /** Gastos agrupados por detalle (sin distinguir mayúsculas), del que suma más al que menos. */
  byDetail: DetailGroup[]
}

/** Desglose de una categoría en un mes. `categoryId` es la llave de `monthSummary().byCategory`. */
export function categoryBreakdown(data: AppData, key: MonthKey, categoryId: string): CategoryBreakdown {
  const entries = spendEntriesOfMonth(data, key)
    .filter((e) => (e.tx.categoryId ?? 'otros') === categoryId)
    .sort((a, b) => b.tx.date.localeCompare(a.tx.date) || b.tx.createdAt - a.tx.createdAt)
  const groups = new Map<string, DetailGroup>()
  for (const { tx, amount } of entries) {
    const note = tx.note.trim()
    const id = note.toLocaleLowerCase('es')
    const g = groups.get(id) ?? { label: note || 'Sin detalle', count: 0, total: 0 }
    g.count++
    g.total += amount
    groups.set(id, g)
  }
  return {
    entries,
    total: entries.reduce((a, e) => a + e.amount, 0),
    byDetail: [...groups.values()].sort((a, b) => b.total - a.total || b.count - a.count),
  }
}

/** "Otros" / "Otros ingresos": el cajón de sastre que siempre va al final de la lista. */
export function isCatchAll(c: Category): boolean {
  return c.id === 'otros' || c.id === 'otros-ingresos' || /^otros?\b/i.test(c.name.trim())
}

/** Mantiene el orden de creación, pero con "Otros" siempre al final. */
export function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => Number(isCatchAll(a)) - Number(isCatchAll(b)))
}

export function expenseCategories(data: AppData, includeArchived = false): Category[] {
  return sortCategories(data.categories.filter((c) => c.kind === 'expense' && (includeArchived || !c.archived)))
}

export function incomeCategories(data: AppData): Category[] {
  return sortCategories(data.categories.filter((c) => c.kind === 'income' && !c.archived))
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
  for (const e of spendEntries(data)) {
    const k = monthKeyOf(e.date)
    totals.set(k, (totals.get(k) ?? 0) + e.amount)
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
