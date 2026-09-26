export type TxType = 'expense' | 'income' | 'adjustment'

/** Montos siempre en pesos enteros (CLP no usa decimales). */
export interface Transaction {
  id: string
  type: TxType
  /** Siempre positivo para gastos/ingresos. En ajustes lleva signo (+ sube el saldo, − lo baja). */
  amount: number
  /** null solo para ajustes de saldo. */
  categoryId: string | null
  note: string
  /** Fecha local del movimiento, formato YYYY-MM-DD. */
  date: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: 'expense' | 'income'
  /** Presupuesto mensual en pesos. 0 = sin presupuesto. */
  budget: number
  archived?: boolean
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  /** Saldo con el que partiste a usar la app. */
  openingBalance: number
  /** Presupuesto total mensual. null = usar la suma de los presupuestos por categoría. */
  monthlyBudget: number | null
  theme: ThemePref
  onboarded: boolean
}

export interface AppData {
  version: 1
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
}
