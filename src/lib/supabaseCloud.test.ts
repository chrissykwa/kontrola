import { describe, expect, it } from 'vitest'
import { createInitialData } from './defaults'
import {
  categoryToRow,
  diffData,
  isEmpty,
  rowToCategory,
  rowToSettings,
  rowToTx,
  settingsToRow,
  txToRow,
} from './supabaseCloud'
import type { AppData, Transaction } from './types'

const tx = (id: string, amount = 1000): Transaction => ({
  id,
  type: 'expense',
  amount,
  categoryId: 'comida',
  note: 'Chicle',
  date: '2026-10-04',
  createdAt: 1_790_000_000_000,
})

function base(): AppData {
  const d = createInitialData()
  return { ...d, settings: { ...d.settings, onboarded: true }, transactions: [tx('a'), tx('b')] }
}

describe('diffData', () => {
  it('sin cambios no sube nada', () => {
    const d = base()
    expect(isEmpty(diffData(d, d))).toBe(true)
  })

  it('sube solo el movimiento nuevo o editado', () => {
    const prev = base()
    const edited = { ...prev.transactions[1], amount: 2000 }
    const next = { ...prev, transactions: [prev.transactions[0], edited, tx('c')] }
    const c = diffData(prev, next)
    expect(c.upsertTx.map((t) => t.id)).toEqual(['b', 'c'])
    expect(c.deletedTx).toEqual([])
    expect(c.settings).toBeNull()
    expect(c.categories).toBeNull()
  })

  it('detecta movimientos eliminados', () => {
    const prev = base()
    const next = { ...prev, transactions: [prev.transactions[0]] }
    expect(diffData(prev, next).deletedTx).toEqual(['b'])
  })

  it('sube ajustes y categorías cuando cambian, y borra categorías quitadas', () => {
    const prev = base()
    const next = {
      ...prev,
      settings: { ...prev.settings, monthlyBudget: 950_000 },
      categories: prev.categories.filter((c) => c.id !== 'educacion'),
    }
    const c = diffData(prev, next)
    expect(c.settings?.monthlyBudget).toBe(950_000)
    expect(c.categories).toHaveLength(prev.categories.length - 1)
    expect(c.deletedCategories).toEqual(['educacion'])
  })

  it('la primera vez (nube vacía) sube todo', () => {
    const empty: AppData = { version: 1, settings: {} as AppData['settings'], categories: [], transactions: [] }
    const next = base()
    const c = diffData(empty, next)
    expect(c.settings).toBe(next.settings)
    expect(c.categories).toHaveLength(next.categories.length)
    expect(c.upsertTx).toHaveLength(2)
  })
})

describe('filas de Supabase', () => {
  it('ida y vuelta sin perder datos', () => {
    const d = base()
    expect(rowToTx(txToRow('u1', d.transactions[0]))).toEqual(d.transactions[0])
    const cat = d.categories[0]
    expect(rowToCategory(categoryToRow('u1', cat, 0))).toEqual({ ...cat, archived: false })
    const s = { ...d.settings, monthlyBudget: 500_000 }
    expect(rowToSettings(settingsToRow('u1', s))).toEqual({ ...s, themeChosen: false })
  })

  it('los montos grandes vuelven como número', () => {
    const row = { ...txToRow('u1', tx('x')), amount: '1118294' as unknown as number }
    expect(rowToTx(row).amount).toBe(1_118_294)
  })
})
