import { describe, expect, it } from 'vitest'
import { createVault } from './crypto'
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
  type TransactionRow,
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

describe('filas cifradas de Supabase', () => {
  it('ida y vuelta sin perder datos, y sin nada legible en la fila', async () => {
    const { key } = await createVault('clave123')
    const d = base()
    const t = d.transactions[0]
    const row = await txToRow(key, 'u1', t)
    expect(row.payload).toMatch(/^v1:/)
    expect(row.amount).toBeNull()
    expect(row.note).toBeNull()
    expect(row.date).toBeNull()
    expect(JSON.stringify(row)).not.toContain('Chicle')
    expect(await rowToTx(key, row)).toEqual(t)

    const cat = d.categories[0]
    const catRow = await categoryToRow(key, 'u1', cat, 0)
    expect(catRow.name).toBeNull()
    expect(await rowToCategory(key, catRow)).toEqual(cat)

    const s = { ...d.settings, monthlyBudget: 500_000 }
    const sRow = await settingsToRow(key, 'u1', s)
    expect(sRow.opening_balance).toBeNull()
    expect(await rowToSettings(key, sRow)).toEqual(s)
  })

  it('una fila cifrada de otro usuario no se puede leer como propia', async () => {
    const { key } = await createVault('clave123')
    const row = await txToRow(key, 'u1', tx('a'))
    await expect(rowToTx(key, { ...row, user_id: 'u2' })).rejects.toThrow()
  })

  it('lee filas antiguas en texto plano (para migrarlas)', async () => {
    const { key } = await createVault('clave123')
    const legacy: TransactionRow = {
      user_id: 'u1',
      id: 'x',
      created_ms: 5,
      payload: null,
      type: 'expense',
      amount: '1118294' as unknown as number,
      category_id: 'comida',
      note: 'Pan',
      date: '2026-10-01',
    }
    expect(await rowToTx(key, legacy)).toEqual({
      id: 'x',
      type: 'expense',
      amount: 1_118_294,
      categoryId: 'comida',
      note: 'Pan',
      date: '2026-10-01',
      createdAt: 5,
    })
  })
})
