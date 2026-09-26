/** Todas las fechas se manejan como strings locales YYYY-MM-DD para evitar líos de zona horaria. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return toISODate(new Date())
}

export function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "2026-09" */
export type MonthKey = string

export function monthKeyOf(date: string): MonthKey {
  return date.slice(0, 7)
}

export function currentMonth(): MonthKey {
  return monthKeyOf(today())
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const monthFmt = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })
const monthShortFmt = new Intl.DateTimeFormat('es-CL', { month: 'short' })
const dayFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Septiembre 2026" */
export function monthLabel(key: MonthKey): string {
  return capitalize(monthFmt.format(parseISODate(`${key}-01`)).replace(' de ', ' '))
}

/** "sept" */
export function monthShortLabel(key: MonthKey): string {
  return monthShortFmt.format(parseISODate(`${key}-01`)).replace('.', '')
}

/** "Hoy", "Ayer" o "Jueves 24 de septiembre" */
export function dayLabel(date: string): string {
  if (date === today()) return 'Hoy'
  if (date === yesterday()) return 'Ayer'
  return capitalize(dayFmt.format(parseISODate(date)))
}

/** "24 sept" */
export function shortDayLabel(date: string): string {
  return shortDayFmt.format(parseISODate(date)).replace('.', '')
}
