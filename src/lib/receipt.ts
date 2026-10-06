import { today } from './dates'
import type { AppData } from './types'

export interface ReceiptSuggestion {
  amount: number | null
  note: string
  date: string | null
  categoryId: string | null
  rawText: string
}

const fold = (value: string) => value.toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function amountFrom(line: string): number | null {
  const tokens = [...line.matchAll(/(?:\$\s*)?(?:\d{1,3}(?:[.,\s]\d{3})+|\d{3,8})(?:[.,]00)?/g)]
  if (!tokens.length) return null
  const candidate = tokens.at(-1)?.[0] ?? ''
  const amount = Number(candidate.replace(/[.,]00$/, '').replace(/[^\d]/g, ''))
  return amount >= 100 && amount <= 100_000_000 ? amount : null
}

function dateFrom(text: string): string | null {
  const match = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b|\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
  if (!match) return null
  const year = Number(match[1] ?? (match[6].length === 2 ? `20${match[6]}` : match[6]))
  const month = Number(match[2] ?? match[5])
  const day = Number(match[3] ?? match[4])
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return null
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return date <= today() ? date : null
}

function categoryFor(note: string, data: AppData): string | null {
  const key = fold(note).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (key.length >= 4) {
    const learned = [...data.transactions].reverse().find((t) => t.type === 'expense' && t.categoryId && fold(t.note).trim().length >= 4 && (fold(t.note).includes(key) || key.includes(fold(t.note))))
    if (learned?.categoryId && data.categories.some((c) => c.id === learned.categoryId)) return learned.categoryId
  }
  const rules: [RegExp, string][] = [
    [/supermercado|jumbo|lider|unimarc|tottus|santa isabel/i, 'supermercado'],
    [/restaurant|restaurante|cafe|cafeteria|pizza|burger|sushi|rappi|pedidosya/i, 'comida'],
    [/uber|cabify|metro|copec|shell|estacionamiento|bencina/i, 'transporte'],
    [/farmacia|cruz verde|salcobrand|clinica|hospital/i, 'salud'],
    [/netflix|spotify|disney|youtube premium|prime video/i, 'suscripciones'],
    [/cine|teatro|concierto|ticket/i, 'ocio'],
  ]
  return rules.find(([pattern, id]) => pattern.test(key) && data.categories.some((c) => c.id === id))?.[1] ?? null
}

/** Extrae una propuesta conservadora; nunca crea el movimiento automáticamente. */
export function suggestReceipt(text: string, data: AppData): ReceiptSuggestion {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const totalLines = lines.filter((line) => /\b(total(?: a pagar)?|importe total|monto total)\b/i.test(line) && !/subtotal|total neto|descuento/i.test(line))
  const totalCandidates = totalLines.map(amountFrom).filter((n): n is number => n !== null)
  const amounts = lines.filter((line) => !/\b(rut|telefono|folio|boleta nro|factura nro)\b/i.test(line)).map(amountFrom).filter((n): n is number => n !== null)
  const amount = totalCandidates.at(-1) ?? (amounts.length ? Math.max(...amounts) : null)
  const merchant = lines.slice(0, 8).find((line) => !/\b(boleta|factura|rut|fecha|hora|sucursal|direccion|folio|gracias|ticket)\b/i.test(line) && !/^\d/.test(line) && !amountFrom(line)) ?? ''
  const note = merchant.slice(0, 80)
  return { amount, note, date: dateFrom(text), categoryId: categoryFor(note, data), rawText: text }
}
