import { describe, expect, it } from 'vitest'
import { dateLabel } from './dates'
import { createInitialData } from './defaults'
import { formatCLP, formatCompact, parseAmount } from './money'
import { categoryBreakdown, currentBalance, expenseCategories, monthPace, monthSummary, monthlyTotals, noteSuggestions, totalBudget } from './stats'
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
  return { ...d, settings: { ...d.settings, ...patch, accounts: patch.accounts ?? [{ ...d.settings.accounts[0], openingBalance: patch.openingBalance ?? 0 }], onboarded: true }, transactions }
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

describe('fechas', () => {
  it('muestra día y mes, y el año solo si no es el actual', () => {
    expect(dateLabel('2026-11-10', '2026-10-06')).toBe('10 nov')
    expect(dateLabel('2027-01-10', '2026-10-06')).toBe('10 ene 2027')
  })
})

describe('desglose por categoría', () => {
  it('lista los gastos del mes y los agrupa por detalle', () => {
    const d = data([
      tx({ note: 'Uber', amount: 4000, categoryId: 'transporte', date: '2026-09-02' }),
      tx({ note: 'uber ', amount: 3500, categoryId: 'transporte', date: '2026-09-05' }),
      tx({ note: 'Metro', amount: 800, categoryId: 'transporte', date: '2026-09-04' }),
      tx({ note: '', amount: 1000, categoryId: 'transporte', date: '2026-09-01' }),
      tx({ note: 'Uber', amount: 9000, categoryId: 'transporte', date: '2026-08-30' }),
      tx({ note: 'Uber', amount: 5000, categoryId: 'comida', date: '2026-09-03' }),
      tx({ type: 'income', amount: 5000, categoryId: 'transporte', date: '2026-09-03' }),
    ])
    const b = categoryBreakdown(d, '2026-09', 'transporte')
    expect(b.total).toBe(9300)
    expect(b.transactions.map((t) => t.date)).toEqual(['2026-09-05', '2026-09-04', '2026-09-02', '2026-09-01'])
    expect(b.byDetail).toEqual([
      { label: 'uber', count: 2, total: 7500 },
      { label: 'Sin detalle', count: 1, total: 1000 },
      { label: 'Metro', count: 1, total: 800 },
    ])
  })

  it('los gastos sin categoría van a "otros"', () => {
    const d = data([tx({ categoryId: null, amount: 700 })])
    expect(categoryBreakdown(d, '2026-09', 'otros').total).toBe(700)
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
    expect(csv.split('\n')[1]).toBe('2026-09-10;Gasto;Comida y antojos;"pan; queso";-500;principal;')
  })
})

describe('categorías', () => {
  it('deja "Otros" siempre al final aunque se creen categorías nuevas', () => {
    const d = data([])
    d.categories.push({ id: 'tc', name: 'Tarjeta de Crédito', icon: 'receipt', color: '#3b82f6', kind: 'expense', budget: 0 })
    const names = expenseCategories(d).map((c) => c.name)
    expect(names.at(-1)).toBe('Otros')
    expect(names.at(-2)).toBe('Tarjeta de Crédito')
  })
})

describe('tema', () => {
  it('usa claro salvo que el usuario haya elegido otro', () => {
    const base = { ...data([]), transactions: [] }
    expect(normalize({ ...base, settings: { ...base.settings, theme: 'system' } }).settings.theme).toBe('light')
    expect(normalize({ ...base, settings: { ...base.settings, theme: 'dark', themeChosen: true } }).settings.theme).toBe('dark')
  })
})
