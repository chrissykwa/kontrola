import { describe, expect, it } from 'vitest'
import { createInitialData } from './defaults'
import { suggestReceipt } from './receipt'

describe('lectura de recibos', () => {
  it('prefiere el total y propone comercio, fecha y categoría', () => {
    const result = suggestReceipt('CAFE CENTRAL\nBOLETA ELECTRONICA\nFecha: 02/10/2026\nCafe $3.500\nPropina $350\nTOTAL $3.850', createInitialData())
    expect(result).toMatchObject({ amount: 3850, note: 'CAFE CENTRAL', date: '2026-10-02', categoryId: 'comida' })
  })

  it('deja vacíos los datos inciertos para revisión manual', () => {
    const result = suggestReceipt('Imagen borrosa\nSin datos legibles', createInitialData())
    expect(result.amount).toBeNull()
    expect(result.date).toBeNull()
    expect(result.categoryId).toBeNull()
  })
})
