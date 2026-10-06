import { createInitialData, DEFAULT_CATEGORIES } from './defaults'
import type { AppData, Category, IncomeSource, MoneyAccount, Transaction } from './types'

/**
 * Capa de persistencia. Hoy guarda en el navegador (localStorage); la interfaz
 * `DataStore` permite cambiarla más adelante por una API/servidor sin tocar la UI.
 */
export interface DataStore {
  load(): AppData
  save(data: AppData): void
}

const KEY = 'kontrola:data'

export const localStore: DataStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return createInitialData()
      return normalize(JSON.parse(raw))
    } catch {
      return createInitialData()
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Almacenamiento lleno o bloqueado (modo privado): la app sigue funcionando en memoria.
    }
  },
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function normalizeTx(v: unknown): Transaction | null {
  if (!isObj(v)) return null
  const type = v.type
  if (type !== 'expense' && type !== 'income' && type !== 'adjustment' && type !== 'transfer') return null
  if (!isStr(v.id) || !isNum(v.amount) || !isStr(v.date) || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null
  return {
    id: v.id,
    type,
    amount: Math.round(v.amount),
    categoryId: isStr(v.categoryId) ? v.categoryId : null,
    note: isStr(v.note) ? v.note : '',
    date: v.date,
    createdAt: isNum(v.createdAt) ? v.createdAt : Date.now(),
    accountId: isStr(v.accountId) ? v.accountId : 'principal',
    toAccountId: isStr(v.toAccountId) ? v.toAccountId : undefined,
    incomeSourceId: isStr(v.incomeSourceId) ? v.incomeSourceId : undefined,
    installments: isNum(v.installments) ? Math.max(1, Math.min(60, Math.round(v.installments))) : undefined,
  }
}

function normalizeAccount(v: unknown): MoneyAccount | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !v.name.trim()) return null
  return {
    id: v.id,
    name: v.name,
    kind: v.kind === 'credit' ? 'credit' : 'cash',
    openingBalance: isNum(v.openingBalance) ? Math.round(v.openingBalance) : 0,
    closingDay: isNum(v.closingDay) ? Math.max(1, Math.min(31, Math.round(v.closingDay))) : 25,
    dueDay: isNum(v.dueDay) ? Math.max(1, Math.min(31, Math.round(v.dueDay))) : 10,
    defaultInstallments: isNum(v.defaultInstallments) ? Math.max(1, Math.min(60, Math.round(v.defaultInstallments))) : undefined,
    cycleOverrides: Array.isArray(v.cycleOverrides) ? v.cycleOverrides.filter((cycle): cycle is Record<string, unknown> => isObj(cycle) && isStr(cycle.month) && isStr(cycle.closeDate) && /^\d{4}-\d{2}$/.test(cycle.month) && validISO(cycle.closeDate) && cycle.closeDate.startsWith(cycle.month) && (!isStr(cycle.dueDate) || validISO(cycle.dueDate)))
      .map((cycle) => ({ month: cycle.month as string, closeDate: cycle.closeDate as string, dueDate: isStr(cycle.dueDate) ? cycle.dueDate : undefined })) : undefined,
    openingDueDate: isStr(v.openingDueDate) && /^\d{4}-\d{2}-\d{2}$/.test(v.openingDueDate) ? v.openingDueDate : undefined,
    archived: v.archived === true,
  }
}

function validISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate()
}

function normalizeIncomeSource(v: unknown): IncomeSource | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !isStr(v.accountId) || !isStr(v.nextDate)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.nextDate)) return null
  return {
    id: v.id, name: v.name, accountId: v.accountId,
    expectedAmount: isNum(v.expectedAmount) ? Math.max(0, Math.round(v.expectedAmount)) : 0,
    recurring: v.recurring === true,
    nextDate: v.nextDate,
    intervalMonths: isNum(v.intervalMonths) ? Math.max(1, Math.round(v.intervalMonths)) : 1,
    archived: v.archived === true,
  }
}

function normalizeCategory(v: unknown): Category | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name)) return null
  return {
    id: v.id,
    name: v.name,
    icon: isStr(v.icon) ? v.icon : 'ellipsis',
    color: isStr(v.color) ? v.color : '#a3a3a3',
    kind: v.kind === 'income' ? 'income' : 'expense',
    budget: isNum(v.budget) && v.budget > 0 ? Math.round(v.budget) : 0,
    archived: v.archived === true,
  }
}

/** Valida y completa datos que vienen de localStorage o de un respaldo importado. */
export function normalize(input: unknown): AppData {
  if (!isObj(input)) throw new Error('El archivo no tiene el formato de Kontrola.')
  const s = isObj(input.settings) ? input.settings : {}
  const categories = Array.isArray(input.categories)
    ? input.categories.map(normalizeCategory).filter((c): c is Category => c !== null)
    : []
  const transactions = Array.isArray(input.transactions)
    ? input.transactions.map(normalizeTx).filter((t): t is Transaction => t !== null)
    : []
  const accounts = Array.isArray(s.accounts)
    ? s.accounts.map(normalizeAccount).filter((a): a is MoneyAccount => a !== null)
    : []
  const incomeSources = Array.isArray(s.incomeSources)
    ? s.incomeSources.map(normalizeIncomeSource).filter((v): v is IncomeSource => v !== null)
    : []
  return {
    version: 1,
    settings: {
      openingBalance: isNum(s.openingBalance) ? Math.round(s.openingBalance) : 0,
      accounts: accounts.length ? accounts : [{ id: 'principal', name: 'Cuenta principal', kind: 'cash', openingBalance: isNum(s.openingBalance) ? Math.round(s.openingBalance) : 0 }],
      incomeSources,
      monthlyBudget: isNum(s.monthlyBudget) && s.monthlyBudget > 0 ? Math.round(s.monthlyBudget) : null,
      // Versiones anteriores traían "automático" por defecto: solo se respeta si lo eligió el usuario.
      theme: (s.theme === 'system' || s.theme === 'dark') && s.themeChosen === true ? s.theme : 'light',
      themeChosen: s.themeChosen === true,
      onboarded: s.onboarded === true || transactions.length > 0,
    },
    categories: categories.length ? categories : DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions,
  }
}

export function exportJSON(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)
}

export function importJSON(text: string): AppData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('No se pudo leer el archivo: no es un JSON válido.')
  }
  const data = normalize(parsed)
  if (isObj(parsed) && !Array.isArray(parsed.transactions)) {
    throw new Error('El archivo no contiene movimientos de Kontrola.')
  }
  return { ...data, settings: { ...data.settings, onboarded: true } }
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV separado por ";" (así lo abre bien Excel en configuración chilena). */
export function exportCSV(data: AppData): string {
  const names = new Map(data.categories.map((c) => [c.id, c.name]))
  const typeLabel = { expense: 'Gasto', income: 'Ingreso', adjustment: 'Ajuste de saldo', transfer: 'Transferencia' } as const
  const rows = [...data.transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) => {
      const signed = t.type === 'expense' ? -t.amount : t.amount
      return [t.date, typeLabel[t.type], t.categoryId ? names.get(t.categoryId) ?? '' : '', t.note, signed, t.accountId ?? 'principal', t.toAccountId ?? '']
        .map(csvCell)
        .join(';')
    })
  return ['Fecha;Tipo;Categoría;Detalle;Monto;Cuenta;Cuenta destino', ...rows].join('\n')
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID()
    } catch {
      // randomUUID no disponible fuera de contextos seguros
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
