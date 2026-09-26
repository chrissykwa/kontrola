import { describe, expect, it } from 'vitest'
import { createInitialData } from './defaults'
import { formatCLP, formatCompact, parseAmount } from './money'
import { currentBalance, monthPace, monthSummary, monthlyTotals, noteSuggestions, totalBudget } from './stats'
import { exportCSV, importJSON, normalize } from './storage'
import type { AppData, Transaction } from './types'

let seq = 0
function tx(partial: Partial<Transaction>): Transaction {
  seq++
  return {
    id: `t${seq}`,
    type: 'expense',
    amount: 1000,
    categoryId: 'comida',
    note: '',
    date: '2026-09-10',
    createdAt: seq,
    ...partial,
  }
}

function data(transactions: Transaction[], patch: Partial<AppData['settings']> = {}): AppData {
  const d = createInitialData()
  return { ...d, settings: { ...d.settings, ...patch, onboarded: true }, transactions }
}

describe('dinero', () => {
  it('formatea pesos chilenos', () => {
    expect(formatCLP(12500)).toBe('$12.500')
    expect(formatCLP(500)).toBe('$500')
    expect(formatCompact(1_250_000)).toBe('$1,3M')
    expect(formatCompact(45_000)).toBe('$45k')
  })

  it('lee montos escritos de cualquier forma', () => {
    expect(parseAmount('12.500')).toBe(12500)
    expect(parseAmount('$ 1.000.000')).toBe(1_000_000)
    expect(parseAmount('')).toBe(0)
  })
})

describe('saldo', () => {
  it('parte del saldo inicial, resta gastos y suma ingresos y ajustes', () => {
    const d = data(
      [
        tx({ amount: 500 }),
        tx({ type: 'income', amount: 10_000, categoryId: 'sueldo' }),
        tx({ type: 'adjustment', amount: -2_000, categoryId: null }),
      ],
      { openingBalance: 100_000 },
    )
    expect(currentBalance(d)).toBe(107_500)
  })
})

describe('resumen del mes', () => {
  it('agrupa gasto por categoría y día e ignora ajustes y otros meses', () => {
    const d = data([
      tx({ amount: 500, date: '2026-09-01' }),
      tx({ amount: 1500, date: '2026-09-01', categoryId: 'transporte' }),
      tx({ amount: 3000, date: '2026-09-30' }),
      tx({ amount: 9999, date: '2026-08-31' }),
      tx({ type: 'adjustment', amount: -5000, categoryId: null, date: '2026-09-05' }),
      tx({ type: 'income', amount: 800_000, categoryId: 'sueldo', date: '2026-09-05' }),
    ])
    const s = monthSummary(d, '2026-09')
    expect(s.spent).toBe(5000)
    expect(s.income).toBe(800_000)
    expect(s.byCategory.get('comida')).toBe(3500)
    expect(s.byCategory.get('transporte')).toBe(1500)
    expect(s.daily).toHaveLength(30)
    expect(s.daily[0]).toBe(2000)
    expect(s.daily[29]).toBe(3000)
  })
})

describe('presupuesto', () => {
  it('usa el total definido o, si no hay, la suma por categoría', () => {
    const d = data([])
    expect(totalBudget(d)).toBe(0)
    d.categories = d.categories.map((c) => (c.id === 'comida' ? { ...c, budget: 100_000 } : c))
    expect(totalBudget(d)).toBe(100_000)
    d.settings.monthlyBudget = 500_000
    expect(totalBudget(d)).toBe(500_000)
  })

  it('calcula cuánto puedes gastar por día lo que queda del mes', () => {
    // Septiembre tiene 30 días; al día 21 quedan 10 días (21..30).
    const d = data([tx({ amount: 200_000, date: '2026-09-05' })], { monthlyBudget: 300_000 })
    const p = monthPace(d, '2026-09', '2026-09-21')
    expect(p.remaining).toBe(100_000)
    expect(p.daysLeft).toBe(10)
    expect(p.perDay).toBe(10_000)
    expect(p.status).toBe('ok')
  })

  it('avisa cuando vas más rápido de lo esperado o te pasaste', () => {
    const fast = data([tx({ amount: 200_000, date: '2026-09-05' })], { monthlyBudget: 300_000 })
    expect(monthPace(fast, '2026-09', '2026-09-10').status).toBe('warning')
    const over = data([tx({ amount: 310_000 })], { monthlyBudget: 300_000 })
    const p = monthPace(over, '2026-09', '2026-09-10')
    expect(p.status).toBe('over')
    expect(p.perDay).toBe(0)
  })

  it('en meses pasados no quedan días', () => {
    const d = data([], { monthlyBudget: 300_000 })
    expect(monthPace(d, '2026-08', '2026-09-10').daysLeft).toBe(0)
  })
})

describe('historial', () => {
  it('devuelve los últimos meses en orden, con ceros donde no hubo gasto', () => {
    const d = data([tx({ amount: 1000, date: '2026-07-02' }), tx({ amount: 2000, date: '2026-09-02' })])
    expect(monthlyTotals(d, '2026-09', 3)).toEqual([
      { key: '2026-07', spent: 1000 },
      { key: '2026-08', spent: 0 },
      { key: '2026-09', spent: 2000 },
    ])
  })
})

describe('sugerencias', () => {
  it('recuerda categoría y último monto por detalle, ordenado por frecuencia', () => {
    const d = data([
      tx({ note: 'Chicle', amount: 400, date: '2026-09-01' }),
      tx({ note: 'chicle', amount: 500, date: '2026-09-03' }),
      tx({ note: 'Uber', amount: 4000, categoryId: 'transporte' }),
    ])
    const [first, second] = noteSuggestions(d)
    expect(first).toMatchObject({ note: 'chicle', amount: 500, count: 2, categoryId: 'comida' })
    expect(second).toMatchObject({ note: 'Uber', categoryId: 'transporte' })
  })
})

describe('respaldos', () => {
  it('importa un respaldo y descarta registros inválidos', () => {
    const d = data([tx({ amount: 700 })], { openingBalance: 5000 })
    const raw = JSON.stringify({ ...d, transactions: [...d.transactions, { id: 'x', type: 'otro' }] })
    const back = importJSON(raw)
    expect(back.transactions).toHaveLength(1)
    expect(back.settings.openingBalance).toBe(5000)
  })

  it('rechaza archivos que no son de Kontrola', () => {
    expect(() => importJSON('no es json')).toThrow()
    expect(() => importJSON('{"hola": 1}')).toThrow()
    expect(() => normalize(null)).toThrow()
  })

  it('exporta CSV con signo y escapando separadores', () => {
    const csv = exportCSV(data([tx({ amount: 500, note: 'pan; queso' })]))
    expect(csv.split('\n')[1]).toBe('2026-09-10;Gasto;Comida y antojos;"pan; queso";-500')
  })
})
