import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { dayLabel, today, yesterday } from '../lib/dates'
import { formatCLP, formatDigits, formatSigned, parseAmount } from '../lib/money'
import { expenseCategories, incomeCategories, noteSuggestions, type Suggestion } from '../lib/stats'
import type { Transaction } from '../lib/types'
import { useStore, type TxInput } from '../state/store'
import { CategoryIcon } from './Icon'
import { useToast } from './Toast'

export function TransactionForm({ editing, onDone }: { editing?: Transaction; onDone: () => void }) {
  const { deleteTransaction, restoreTransaction } = useStore()
  const toast = useToast()

  if (editing?.type === 'adjustment') {
    return (
      <div className="form">
        <p className="lead">
          Ajuste de saldo por <strong>{formatSigned(editing.amount)}</strong> el {dayLabel(editing.date).toLowerCase()}.
        </p>
        <p className="hint">Los ajustes corrigen el saldo para que calce con tu banco. No cuentan como gasto del mes.</p>
        <button
          type="button"
          className="btn btn--danger-ghost"
          onClick={() => {
            const removed = deleteTransaction(editing.id)
            onDone()
            toast({ message: 'Ajuste eliminado', onAction: removed ? () => restoreTransaction(removed) : undefined })
          }}
        >
          <Trash2 size={18} aria-hidden="true" /> Eliminar ajuste
        </button>
      </div>
    )
  }

  return <TxEditor editing={editing} onDone={onDone} key={editing?.id ?? 'new'} />
}

function TxEditor({ editing, onDone }: { editing?: Transaction; onDone: () => void }) {
  const { data, addTransaction, updateTransaction, deleteTransaction, restoreTransaction } = useStore()
  const toast = useToast()
  const [type, setType] = useState<'expense' | 'income'>(editing?.type === 'income' ? 'income' : 'expense')
  const [amountText, setAmountText] = useState(editing ? formatDigits(editing.amount) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [date, setDate] = useState(editing?.date ?? today())
  const [noteFocused, setNoteFocused] = useState(false)

  const amount = parseAmount(amountText)
  const categories = type === 'expense' ? expenseCategories(data) : incomeCategories(data)
  const allSuggestions = useMemo(() => noteSuggestions(data), [data])

  const suggestions = useMemo(() => {
    const q = note.trim().toLocaleLowerCase('es')
    const sameType = allSuggestions.filter((s) => s.type === type)
    if (!q) return sameType.slice(0, 6)
    return sameType.filter((s) => s.note.toLocaleLowerCase('es').includes(q) && s.note.toLocaleLowerCase('es') !== q).slice(0, 4)
  }, [note, type, allSuggestions])

  const pickSuggestion = (s: Suggestion) => {
    setNote(s.note)
    if (s.categoryId && categories.some((c) => c.id === s.categoryId)) setCategoryId(s.categoryId)
    if (!amount) setAmountText(formatDigits(s.amount))
  }

  const switchType = (next: 'expense' | 'income') => {
    setType(next)
    setCategoryId(null)
  }

  const valid = amount > 0 && categoryId !== null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const tx: TxInput = { type, amount, categoryId, note: note.trim(), date }
    if (editing) {
      updateTransaction(editing.id, tx)
      toast({ message: 'Movimiento actualizado' })
    } else {
      addTransaction(tx)
      toast({ message: `${type === 'expense' ? 'Gasto' : 'Ingreso'} de ${formatCLP(amount)} registrado` })
    }
    onDone()
  }

  const showSuggestions = suggestions.length > 0 && (noteFocused || !note)

  return (
    <form className="form" onSubmit={submit}>
      <div className="segmented" role="radiogroup" aria-label="Tipo de movimiento">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={`segmented__opt ${type === t ? 'is-active' : ''} ${t}`}
            onClick={() => switchType(t)}
          >
            {t === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      {/* El número se dibuja aparte y el input real queda invisible encima: así nunca se
          recorta ni se corre, sin importar el largo ni la fuente del teléfono. */}
      <label className="amount-field">
        <span className="sr-only">Monto</span>
        <span
          className={`amount-field__display ${amountText.length > 10 ? 'is-xl' : amountText.length > 7 ? 'is-lg' : ''}`}
          aria-hidden="true"
        >
          <span className="amount-field__currency">$</span>
          <span className={amountText ? '' : 'is-placeholder'}>{amountText || '0'}</span>
          <span className="amount-field__caret" />
        </span>
        <input
          className="amount-field__input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={amountText.replace(/\D/g, '')}
          data-autofocus={editing ? undefined : ''}
          onChange={(e) => {
            const n = parseAmount(e.target.value)
            setAmountText(n ? formatDigits(n) : '')
          }}
          // El cursor siempre al final: cada dígito nuevo se agrega a la derecha.
          onSelect={(e) => {
            const el = e.currentTarget
            const end = el.value.length
            if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end)
          }}
          aria-describedby="amount-hint"
        />
      </label>
      <p id="amount-hint" className="sr-only">
        Monto en pesos chilenos
      </p>

      <div className="field">
        <label htmlFor="tx-note" className="field__label">
          Detalle <span className="field__optional">(opcional)</span>
        </label>
        <input
          id="tx-note"
          className="input"
          placeholder={type === 'expense' ? 'Ej: chicle, almuerzo, Uber' : 'Ej: sueldo septiembre'}
          value={note}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => setNote(e.target.value)}
          onFocus={() => setNoteFocused(true)}
          onBlur={() => window.setTimeout(() => setNoteFocused(false), 150)}
        />
        {showSuggestions && (
          <div className="chips" aria-label={note ? 'Sugerencias' : 'Frecuentes'}>
            {suggestions.map((s) => (
              <button key={s.note} type="button" className="chip" onClick={() => pickSuggestion(s)}>
                {s.note}
                <span className="chip__meta">{formatCLP(s.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="field">
        <legend className="field__label">Categoría</legend>
        <div className="cat-grid" role="radiogroup" aria-label="Categoría">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={categoryId === c.id}
              className={`cat-option ${categoryId === c.id ? 'is-active' : ''}`}
              onClick={() => setCategoryId(c.id)}
            >
              <CategoryIcon category={c} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Fecha</legend>
        <div className="date-row">
          <button type="button" className={`chip ${date === today() ? 'is-active' : ''}`} onClick={() => setDate(today())}>
            Hoy
          </button>
          <button
            type="button"
            className={`chip ${date === yesterday() ? 'is-active' : ''}`}
            onClick={() => setDate(yesterday())}
          >
            Ayer
          </button>
          <input
            type="date"
            className="input input--date"
            value={date}
            max={today()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Elegir otra fecha"
          />
        </div>
      </fieldset>

      <div className="form__actions">
        {editing && (
          <button
            type="button"
            className="btn btn--danger-ghost"
            onClick={() => {
              const removed = deleteTransaction(editing.id)
              onDone()
              toast({ message: 'Movimiento eliminado', onAction: removed ? () => restoreTransaction(removed) : undefined })
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            <span className="sr-only">Eliminar</span>
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={!valid}>
          {editing ? 'Guardar cambios' : amount ? `Registrar ${formatCLP(amount)}` : 'Registrar'}
        </button>
      </div>
      {!valid && amount > 0 && <p className="hint hint--center">Elige una categoría para registrar</p>}
    </form>
  )
}
