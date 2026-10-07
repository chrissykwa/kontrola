import { describe, expect, it } from 'vitest'
import { createInitialData } from './defaults'
import { parseImport } from './imports'
import { incomeOccurrences, predictExpenses } from './planning'
import { accountBalance, creditBills, creditCycle, currentBalance, monthSummary } from './stats'
import { normalize } from './storage'
import type { Transaction } from './types'

const tx = (id: string, type: Transaction['type'], amount: number, date: string, accountId = 'principal', toAccountId?: string): Transaction =>
  ({ id, type, amount, date, accountId, toAccountId, categoryId: type === 'expense' ? 'comida' : null, note: id, createdAt: 1 })

describe('cuentas y tarjetas', () => {
  it('migra saldo y movimientos de respaldos anteriores', () => {
    const old = createInitialData()
    old.settings.openingBalance = 50_000
    const raw = JSON.parse(JSON.stringify(old))
    delete raw.settings.accounts
    delete raw.settings.incomeSources
    raw.transactions = [tx('compra', 'expense', 3_000, '2026-10-01')]
    delete raw.transactions[0].accountId
    const migrated = normalize(raw)
    expect(migrated.settings.accounts[0].openingBalance).toBe(50_000)
    expect(currentBalance(migrated)).toBe(47_000)
  })

  it('no descuenta compras con tarjeta del efectivo ni duplica pagos como gasto', () => {
    const data = createInitialData()
    data.settings.accounts[0].openingBalance = 100_000
    data.settings.accounts.push({ id: 'visa', name: 'Visa', kind: 'credit', openingBalance: 0, closingDay: 25, dueDay: 10 })
    data.transactions = [tx('cafe', 'expense', 12_000, '2026-10-20', 'visa'), tx('pago', 'transfer', 5_000, '2026-11-10', 'principal', 'visa')]
    expect(currentBalance(data)).toBe(95_000)
    expect(accountBalance(data, 'visa')).toBe(-7_000)
    // La compra cuenta cuando se paga la tarjeta (vence el 10 nov) y el pago (traspaso) no suma otra vez.
    expect(monthSummary(data, '2026-10').spent).toBe(0)
    expect(monthSummary(data, '2026-11').spent).toBe(12_000)
    expect(creditBills(data, 'visa')).toEqual([{ dueDate: '2026-11-10', amount: 7_000, purchases: 1 }])
  })

  it('mueve al siguiente ciclo compras después del corte, incluso entre años', () => {
    const card = { id: 'visa', name: 'Visa', kind: 'credit' as const, openingBalance: 0, closingDay: 25, dueDay: 10 }
    expect(creditCycle('2026-12-25', card)).toEqual({ closeDate: '2026-12-25', dueDate: '2027-01-10' })
    expect(creditCycle('2026-12-26', card)).toEqual({ closeDate: '2027-01-25', dueDate: '2027-02-10' })
  })

  it('usa cortes reales distintos cada mes y factura cuotas sin interés', () => {
    const data = createInitialData()
    const card = { id: 'visa', name: 'Visa', kind: 'credit' as const, openingBalance: 0, closingDay: 25, dueDay: 10,
      defaultInstallments: 3, cycleOverrides: [
        { month: '2026-10', closeDate: '2026-10-22', dueDate: '2026-11-07' },
        { month: '2026-11', closeDate: '2026-11-27', dueDate: '2026-12-12' },
      ] }
    data.settings.accounts.push(card)
    expect(creditCycle('2026-10-23', card)).toEqual({ closeDate: '2026-11-27', dueDate: '2026-12-12' })
    data.transactions = [{ ...tx('compra', 'expense', 10_001, '2026-10-20', 'visa'), installments: 3 }]
    expect(accountBalance(data, 'visa')).toBe(-10_001)
    expect(creditBills(data, 'visa')).toEqual([
      { dueDate: '2026-11-07', amount: 3_334, purchases: 1 },
      { dueDate: '2026-12-12', amount: 3_334, purchases: 1 },
      { dueDate: '2027-01-10', amount: 3_333, purchases: 1 },
    ])
    // Cada cuota pesa en el presupuesto del mes en que vence.
    expect(['2026-10', '2026-11', '2026-12', '2027-01'].map((m) => monthSummary(data, m).spent)).toEqual([0, 3_334, 3_334, 3_333])
    expect(normalize(data).settings.accounts[1].cycleOverrides).toHaveLength(2)
    expect(normalize(data).transactions[0].installments).toBe(3)
  })
})

describe('importación y previsión', () => {
  it('lee movimientos agrupados por fechas en español e ignora el saldo superior', () => {
    const data = createInitialData()
    const text = 'CUENTA CORRIENTE $2.140.012\n02 de octubre del 2026\nTraspaso de: Ana +$983.253 >\n01 de octubre del 2026\nTraspaso de: Luis +$200.000 >\n30 de septiembre del 2026\nTraspaso de: Rosa +$160.000 >'
    const rows = parseImport(text, 'text', data, 'principal', 2026)
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => [r.date, r.amount, r.type])).toEqual([
      ['2026-10-02', 983_253, 'income'], ['2026-10-01', 200_000, 'income'], ['2026-09-30', 160_000, 'income'],
    ])
  })

  it('recupera fechas con confusiones comunes de OCR y deja montos dudosos para revisar', () => {
    const rows = parseImport('UZ de octubre del ZUZ6\nTraspaso de: Ana +$200.000\nUl de octubre del ZUZ6\nTraspaso de: Luis +6200.000', 'text', createInitialData(), 'principal', 2026)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: '2026-10-02', amount: 200_000 })
    expect(rows[1]).toMatchObject({ date: '2026-10-01', amount: 0 })
  })
  it('propone categoría aprendida y señala duplicados sin registrarlos', () => {
    const data = createInitialData()
    data.transactions.push({ ...tx('abc', 'expense', 5_000, '2026-10-02'), note: 'Uber' })
    data.transactions[0].categoryId = 'transporte'
    const rows = parseImport('Fecha;Descripción;Monto\n02/10/2026;Uber;5.000\n03/10/2026;Uber;4.000', 'csv', data, 'principal')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ duplicate: true, selected: false, categoryId: 'transporte' })
    expect(rows[1]).toMatchObject({ date: '2026-10-03', amount: 4_000, categoryId: 'transporte' })
  })

  it('proyecta ingresos sin añadirlos al saldo y detecta gastos repetidos', () => {
    const data = createInitialData()
    const source = { id: 's', name: 'Sueldo', accountId: 'principal', expectedAmount: 700_000, recurring: true, nextDate: '2026-01-31', intervalMonths: 1 }
    expect(incomeOccurrences(source, '2026-02-01', 2)).toEqual(['2026-02-28', '2026-03-31'])
    data.transactions = [{ ...tx('a', 'expense', 9_000, '2026-08-02'), note: 'Netflix' }, { ...tx('b', 'expense', 10_000, '2026-09-02'), note: 'Netflix' }]
    expect(predictExpenses(data, '2026-10-04')[0]).toMatchObject({ label: 'Netflix', occurrences: 2 })
    expect(currentBalance(data)).toBe(-19_000)
  })
})
