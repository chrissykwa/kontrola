export type TxType = 'expense' | 'income' | 'adjustment' | 'transfer'

export interface CreditCycleOverride {
  /** Mes en que cierra el estado de cuenta. */
  month: string
  closeDate: string
  /** Si falta, se usa el día de pago estimado. */
  dueDate?: string
}

export interface MoneyAccount {
  id: string
  name: string
  kind: 'cash' | 'credit'
  /** Saldo de apertura: en tarjetas, negativo significa deuda inicial. */
  openingBalance: number
  /** Día de cierre y día de vencimiento del pago, solo para tarjetas. */
  closingDay?: number
  dueDay?: number
  /** Fechas reales publicadas por el banco, que pueden variar cada mes. */
  cycleOverrides?: CreditCycleOverride[]
  /** Cuotas sin interés propuestas al registrar una compra; 1 por defecto. */
  defaultInstallments?: number
  openingDueDate?: string
  archived?: boolean
}

export interface IncomeSource {
  id: string
  name: string
  expectedAmount: number
  accountId: string
  recurring: boolean
  /** Fecha del próximo ingreso esperado. */
  nextDate: string
  /** Para ingresos recurrentes: intervalo en meses. */
  intervalMonths: number
  archived?: boolean
}

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
  /** Cuenta donde ocurre el gasto o ingreso. Ausente en respaldos antiguos. */
  accountId?: string
  /** Destino de una transferencia, incluido el pago de tarjeta. */
  toAccountId?: string
  /** Fuente planificada asociada a un ingreso real. */
  incomeSourceId?: string
  /** Número de cuotas sin interés. El monto del movimiento es el total de la compra. */
  installments?: number
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
  /** true cuando el usuario eligió el tema en Ajustes (si no, se usa claro). */
  themeChosen?: boolean
  onboarded: boolean
  accounts: MoneyAccount[]
  incomeSources: IncomeSource[]
}

export interface AppData {
  version: 1
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
}
