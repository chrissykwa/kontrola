import { useState, type FormEvent } from 'react'
import { today } from '../lib/dates'
import { formatCLP, formatSigned } from '../lib/money'
import { accountBalance } from '../lib/stats'
import { useStore } from '../state/store'
import { AmountInput } from './AmountInput'
import { useToast } from './Toast'

/**
 * Cuadrar con el banco: ingresas lo que dice tu cuenta y se registra la
 * diferencia como ajuste (gastos que se te olvidó anotar, intereses, etc.).
 */
export function AdjustBalance({ onDone }: { onDone: () => void }) {
  const { data, addTransaction } = useStore()
  const toast = useToast()
  const [accountId, setAccountId] = useState(data.settings.accounts.find((a) => a.kind === 'cash' && !a.archived)?.id ?? 'principal')
  const balance = accountBalance(data, accountId)
  const [real, setReal] = useState<number | null>(null)
  const [negative, setNegative] = useState(false)

  const target = real === null ? null : negative ? -real : real
  const diff = target === null ? 0 : target - balance

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (target === null) return
    if (diff !== 0) {
      addTransaction({
        type: 'adjustment',
        amount: diff,
        categoryId: null,
        note: diff < 0 ? 'Gastos sin registrar' : 'Ajuste con banco',
        date: today(),
        accountId,
      })
      toast({ message: `Saldo cuadrado en ${formatCLP(target)}` })
    } else {
      toast({ message: 'Todo cuadra, no hubo que ajustar nada' })
    }
    onDone()
  }

  return (
    <form className="form" onSubmit={save}>
      <p className="lead">
        Kontrola calcula <strong>{formatCLP(balance)}</strong>. ¿Cuánto dice tu banco ahora?
      </p>
      <div className="field">
        <label htmlFor="adjust-account" className="field__label">Cuenta que vas a cuadrar</label>
        <select id="adjust-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {data.settings.accounts.filter((a) => a.kind === 'cash' && !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <label htmlFor="real-balance" className="field__label">
          Saldo real en el banco
        </label>
        <AmountInput id="real-balance" value={real} onChange={setReal} autoFocus />
        <label className="check">
          <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
          El saldo está en negativo (sobregiro)
        </label>
      </div>
      {target !== null && (
        <p className={`alert ${diff === 0 ? 'alert--ok' : 'alert--info'}`}>
          <span>
            {diff === 0
              ? 'Coincide exacto. ¡Bien ahí!'
              : `Se registrará un ajuste de ${formatSigned(diff)}${diff < 0 ? ' (gastos que no anotaste)' : ''}. No cuenta como gasto del mes.`}
          </span>
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={target === null}>
        Cuadrar saldo
      </button>
    </form>
  )
}
