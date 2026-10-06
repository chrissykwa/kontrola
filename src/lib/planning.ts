import { shiftMonth } from './dates'
import type { AppData, IncomeSource, Transaction } from './types'

/** Próximas fechas de una fuente sin crear ingresos ficticios en el saldo. */
export function incomeOccurrences(source: IncomeSource, from: string, count = 6): string[] {
  if (source.archived) return []
  const results: string[] = []
  let date = source.nextDate
  const targetDay = Number(source.nextDate.slice(8, 10))
  for (let i = 0; i < 120 && results.length < count; i++) {
    if (date >= from) results.push(date)
    if (!source.recurring) break
    const [year, month] = date.split('-').map(Number)
    const next = shiftMonth(`${year}-${String(month).padStart(2, '0')}`, source.intervalMonths)
    const [ny, nm] = next.split('-').map(Number)
    date = `${next}-${String(Math.min(targetDay, new Date(ny, nm, 0).getDate())).padStart(2, '0')}`
  }
  return results
}

export interface Prediction {
  label: string
  amount: number
  categoryId: string | null
  occurrences: number
}

/** Predicción local, explicable: mediana de compras repetidas por mes. */
export function predictExpenses(data: AppData, today: string): Prediction[] {
  const grouped = new Map<string, Transaction[]>()
  for (const tx of data.transactions) {
    if (tx.type !== 'expense' || !tx.note.trim() || tx.date >= today) continue
    const key = tx.note.trim().toLocaleLowerCase('es-CL')
    grouped.set(key, [...(grouped.get(key) ?? []), tx])
  }
  return [...grouped.entries()].flatMap(([label, txs]) => {
    const months = new Set(txs.map((t) => t.date.slice(0, 7)))
    if (months.size < 2) return []
    const latest = [...txs].sort((a, b) => b.date.localeCompare(a.date))[0]
    const ageMonths = (Number(today.slice(0, 4)) - Number(latest.date.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(latest.date.slice(5, 7))
    if (ageMonths > 2) return []
    const amounts = txs.map((t) => t.amount).sort((a, b) => a - b)
    return [{ label: latest.note || label, amount: amounts[Math.floor(amounts.length / 2)], categoryId: latest.categoryId, occurrences: months.size }]
  }).sort((a, b) => b.occurrences - a.occurrences).slice(0, 6)
}
