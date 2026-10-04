import { describe, expect, it } from 'vitest'
import {
  WrongSecretError,
  createVault,
  decryptJSON,
  encryptJSON,
  generateRecoveryCode,
  normalizeRecoveryCode,
  recoverWithCode,
  unlockWithPassword,
  unlockWithRecoveryCode,
} from './crypto'

describe('cifrado', () => {
  it('cifra y descifra un movimiento', async () => {
    const { key } = await createVault('clave123')
    const tx = { amount: 3490, note: 'Lank', categoryId: 'suscripciones' }
    const payload = await encryptJSON(key, tx, 'transactions:a')
    expect(payload.startsWith('v1:')).toBe(true)
    expect(payload).not.toContain('Lank')
    expect(await decryptJSON(key, payload, 'transactions:a')).toEqual(tx)
  })

  it('no se puede mover un registro cifrado a otra fila', async () => {
    const { key } = await createVault('clave123')
    const payload = await encryptJSON(key, { amount: 1 }, 'transactions:a')
    await expect(decryptJSON(key, payload, 'transactions:b')).rejects.toThrow()
  })

  it('la contraseña correcta abre la llave y la incorrecta no', async () => {
    const { key, bundle } = await createVault('clave123')
    const payload = await encryptJSON(key, { ok: true }, 'settings')
    const again = await unlockWithPassword(bundle, 'clave123')
    expect(await decryptJSON(again, payload, 'settings')).toEqual({ ok: true })
    await expect(unlockWithPassword(bundle, 'otra')).rejects.toBeInstanceOf(WrongSecretError)
  })

  it('el código de recuperación abre la llave aunque se escriba distinto', async () => {
    const { key, bundle, recoveryCode } = await createVault('clave123')
    const payload = await encryptJSON(key, { n: 1 }, 'x')
    const typed = recoveryCode.toLowerCase().replace(/-/g, ' ')
    const viaCode = await unlockWithRecoveryCode(bundle, typed)
    expect(await decryptJSON(viaCode, payload, 'x')).toEqual({ n: 1 })
    await expect(unlockWithRecoveryCode(bundle, generateRecoveryCode())).rejects.toBeInstanceOf(WrongSecretError)
  })

  it('recuperar con el código pone contraseña nueva y entrega un código nuevo', async () => {
    const { key, bundle, recoveryCode } = await createVault('olvidada')
    const payload = await encryptJSON(key, { n: 2 }, 'x')
    const rec = await recoverWithCode(bundle, recoveryCode, 'nueva456')
    expect(rec.recoveryCode).not.toBe(recoveryCode)
    expect(await decryptJSON(await unlockWithPassword(rec.bundle, 'nueva456'), payload, 'x')).toEqual({ n: 2 })
    expect(await decryptJSON(await unlockWithRecoveryCode(rec.bundle, rec.recoveryCode), payload, 'x')).toEqual({ n: 2 })
    await expect(unlockWithPassword(rec.bundle, 'olvidada')).rejects.toBeInstanceOf(WrongSecretError)
  })

  it('el código tiene formato legible', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/)
    expect(code).not.toMatch(/[01IOL]/)
    expect(normalizeRecoveryCode(' ab12-cd34 ')).toBe('AB12CD34')
  })
})
