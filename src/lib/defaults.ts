import type { AppData, Category } from './types'

/** Colores de identidad para categorías (se usan en el ícono, nunca en el texto). */
export const CATEGORY_COLORS = [
  '#3b82f6', // azul
  '#f97316', // naranjo
  '#10b981', // verde agua
  '#eab308', // amarillo
  '#ec4899', // magenta
  '#22c55e', // verde
  '#8b5cf6', // violeta
  '#ef4444', // rojo
  '#06b6d4', // cian
  '#a3a3a3', // gris
]

const expense = (id: string, name: string, icon: string, color: string): Category => ({
  id,
  name,
  icon,
  color,
  kind: 'expense',
  budget: 0,
})

const income = (id: string, name: string, icon: string, color: string): Category => ({
  id,
  name,
  icon,
  color,
  kind: 'income',
  budget: 0,
})

export const DEFAULT_CATEGORIES: Category[] = [
  expense('supermercado', 'Supermercado', 'shopping-cart', '#10b981'),
  expense('comida', 'Comida y antojos', 'utensils', '#f97316'),
  expense('transporte', 'Transporte', 'bus', '#3b82f6'),
  expense('hogar', 'Hogar y cuentas', 'house', '#06b6d4'),
  expense('salud', 'Salud', 'heart-pulse', '#ef4444'),
  expense('ocio', 'Salidas y ocio', 'gamepad-2', '#8b5cf6'),
  expense('compras', 'Compras', 'shopping-bag', '#ec4899'),
  expense('suscripciones', 'Suscripciones', 'repeat', '#eab308'),
  expense('educacion', 'Educación', 'graduation-cap', '#22c55e'),
  expense('otros', 'Otros', 'ellipsis', '#a3a3a3'),
  income('sueldo', 'Sueldo', 'briefcase', '#10b981'),
  income('extra', 'Ingreso extra', 'laptop', '#3b82f6'),
  income('otros-ingresos', 'Otros ingresos', 'piggy-bank', '#eab308'),
]

export function createInitialData(): AppData {
  return {
    version: 1,
    settings: {
      openingBalance: 0,
      monthlyBudget: null,
      theme: 'system',
      onboarded: false,
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
  }
}
