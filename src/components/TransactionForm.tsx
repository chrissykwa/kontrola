import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { dateLabel, dayLabel, today, yesterday } from '../lib/dates'
import { extractImportText } from '../lib/imports'
import { formatCLP, formatDigits, formatSigned, parseAmount } from '../lib/money'
import { suggestReceipt, type ReceiptSuggestion } from '../lib/receipt'
import { creditCycle, expenseCategories, incomeCategories, noteSuggestions, type Suggestion } from '../lib/stats'
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
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(editing?.type === 'income' ? 'income' : editing?.type === 'transfer' ? 'transfer' : 'expense')
  const [amountText, setAmountText] = useState(editing ? formatDigits(editing.amount) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [date, setDate] = useState(editing?.date ?? today())
  const [accountId, setAccountId] = useState(editing?.accountId ?? data.settings.accounts.find((a) => a.kind === 'cash' && !a.archived)?.id ?? 'principal')
  const [installments, setInstallments] = useState(editing?.installments ?? 1)
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? '')
  const [incomeSourceId, setIncomeSourceId] = useState(editing?.incomeSourceId ?? '')
  const [noteFocused, setNoteFocused] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoProposal, setPhotoProposal] = useState<{ url: string; fileName: string; result: ReceiptSuggestion } | null>(null)
  const photoUrl = useRef<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => () => { if (photoUrl.current) URL.revokeObjectURL(photoUrl.current) }, [])

  const amount = parseAmount(amountText)
  const creditAccount = data.settings.accounts.find((a) => a.id === accountId && a.kind === 'credit')
  const categories = type === 'expense' ? expenseCategories(data) : type === 'income' ? incomeCategories(data) : []
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

  const switchType = (next: 'expense' | 'income' | 'transfer') => {
    setType(next)
    setCategoryId(null)
    if (next !== 'expense' && data.settings.accounts.find((a) => a.id === accountId)?.kind === 'credit') {
      setAccountId(data.settings.accounts.find((a) => a.kind === 'cash' && !a.archived)?.id ?? '')
    }
  }

  const valid = amount > 0 && !!accountId && (type === 'transfer' ? !!toAccountId && toAccountId !== accountId : categoryId !== null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const tx: TxInput = { type, amount, categoryId: type === 'transfer' ? null : categoryId, note: note.trim(), date, accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      incomeSourceId: type === 'income' ? incomeSourceId || undefined : undefined }
    if (type === 'expense' && creditAccount) tx.installments = installments
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

  const scanPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Selecciona una imagen.'); return }
    if (file.size > 15 * 1024 * 1024) { setPhotoError('La foto supera 15 MB. Usa una imagen más pequeña.'); return }
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const { text } = await extractImportText(file)
      const result = suggestReceipt(text, data)
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
      const url = URL.createObjectURL(file)
      photoUrl.current = url
      setPhotoProposal({ url, fileName: file.name, result })
      if (!result.amount && !result.note) setPhotoError('No pude leer bien el recibo. Puedes completar el gasto a mano.')
    } catch (err) { setPhotoError(err instanceof Error ? err.message : 'No pude leer la foto') }
    finally { setPhotoBusy(false) }
  }

  const applyPhoto = () => {
    if (!photoProposal) return
    const { result } = photoProposal
    if (result.amount) setAmountText(formatDigits(result.amount))
    if (result.note) setNote(result.note)
    if (result.date) setDate(result.date)
    if (result.categoryId) setCategoryId(result.categoryId)
    setPhotoProposal(null)
    // El monto y la categoría quedan arriba: se vuelve al inicio del panel para revisarlos.
    formRef.current?.closest('.sheet__body')?.scrollTo({ top: 0, behavior: 'smooth' })
    toast({ message: 'Datos propuestos aplicados. Revisa antes de guardar.' })
  }

  return (
    <form className="form" onSubmit={submit} ref={formRef}>
      <div className="segmented" role="radiogroup" aria-label="Tipo de movimiento">
          {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={`segmented__opt ${type === t ? 'is-active' : ''} ${t}`}
            onClick={() => switchType(t)}
          >
            {t === 'expense' ? 'Gasto' : t === 'income' ? 'Ingreso' : 'Traspaso'}
          </button>
        ))}
      </div>


      <div className="field">
        <label htmlFor="tx-account" className="field__label">{type === 'transfer' ? 'Desde cuenta' : 'Cuenta o tarjeta'}</label>
        <select id="tx-account" className="input" value={accountId} onChange={(e) => {
          const next = e.target.value
          setAccountId(next)
          if (!editing || editing.accountId !== next) setInstallments(data.settings.accounts.find((a) => a.id === next)?.defaultInstallments ?? 1)
        }}>
          {data.settings.accounts.filter((a) => !a.archived || a.id === accountId).filter((a) => type === 'expense' || a.kind === 'cash').map((a) =>
            <option key={a.id} value={a.id}>{a.name}{a.kind === 'credit' ? ' · tarjeta' : ''}</option>)}
        </select>
      </div>
      {type === 'expense' && creditAccount && <div className="field">
        <label htmlFor="tx-installments" className="field__label">Pagar en cuotas sin interés</label>
        <input id="tx-installments" className="input" type="number" min="1" max="60" value={installments} onChange={(e) => setInstallments(Number(e.target.value))} required />
        <p className="hint">
          {installments > 1
            ? `${installments} cuotas de ~${formatCLP(Math.round(amount / installments))}. La primera vence el ${dateLabel(creditCycle(date, creditAccount).dueDate)} y cada una cuenta en tu presupuesto el mes en que vence.`
            : `Se paga con la tarjeta el ${dateLabel(creditCycle(date, creditAccount).dueDate)}: ahí cuenta en tu presupuesto.`}
        </p>
      </div>}
      {type === 'transfer' && <div className="field">
        <label htmlFor="tx-destination" className="field__label">Hacia cuenta o tarjeta</label>
        <select id="tx-destination" className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
          <option value="">Selecciona destino</option>
          {data.settings.accounts.filter((a) => !a.archived && a.id !== accountId).map((a) =>
            <option key={a.id} value={a.id}>{a.name}{a.kind === 'credit' ? ' · pago de tarjeta' : ''}</option>)}
        </select>
        <p className="hint">Un pago de tarjeta reduce la deuda y el saldo de la cuenta de origen. No suma un gasto nuevo.</p>
      </div>}
      {type === 'income' && data.settings.incomeSources.length > 0 && <div className="field">
        <label htmlFor="tx-source" className="field__label">Fuente de ingreso <span className="field__optional">(opcional)</span></label>
        <select id="tx-source" className="input" value={incomeSourceId} onChange={(e) => {
          const id = e.target.value
          setIncomeSourceId(id)
          const source = data.settings.incomeSources.find((s) => s.id === id)
          if (source) { setAccountId(source.accountId); if (!amount) setAmountText(formatDigits(source.expectedAmount)); if (!note) setNote(source.name) }
        }}>
          <option value="">Sin fuente planificada</option>
          {data.settings.incomeSources.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>}

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

      {type !== 'transfer' && <fieldset className="field">
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
      </fieldset>}

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

      {/* Foto del recibo: al final, para que al abrir se vea primero el monto. */}
      {type === 'expense' && <section className="receipt-entry" aria-label="Registrar gasto con foto">
        <div className="receipt-entry__intro"><strong>¿Tienes un recibo?</strong><span>Lo leemos y completamos el gasto para que lo confirmes.</span></div>
        <div className="receipt-entry__actions">
          <label className="receipt-picker"><Camera size={18} aria-hidden="true" /> Tomar foto<input type="file" accept="image/*" capture="environment" onChange={scanPhoto} disabled={photoBusy} aria-label="Tomar foto del recibo" /></label>
          <label className="receipt-picker"><ImagePlus size={18} aria-hidden="true" /> Subir imagen<input type="file" accept="image/*" onChange={scanPhoto} disabled={photoBusy} aria-label="Subir imagen del recibo" /></label>
        </div>
        {photoBusy && <p className="hint" role="status">Leyendo foto… Puede tardar unos segundos la primera vez.</p>}
        {photoError && <p className="alert alert--info" role="alert">{photoError}</p>}
        {photoProposal && <div className="receipt-proposal">
          <img src={photoProposal.url} alt={`Vista previa de ${photoProposal.fileName}`} />
          <div><strong>Propuesta para revisar</strong>
            <span>Importe: {photoProposal.result.amount ? formatCLP(photoProposal.result.amount) : 'por completar'}</span>
            <span>Comercio: {photoProposal.result.note || 'por completar'}</span>
            <span>Fecha: {photoProposal.result.date ? dateLabel(photoProposal.result.date) : 'por completar'}</span>
            <span>Categoría: {data.categories.find((c) => c.id === photoProposal.result.categoryId)?.name ?? 'por completar'}</span>
            <button type="button" className="btn btn--ghost" onClick={applyPhoto}>Usar estos datos</button>
          </div>
        </div>}
        <p className="hint">Se lee en tu teléfono y la foto no se guarda.</p>
      </section>}

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
      {!valid && amount > 0 && <p className="hint hint--center">{type === 'transfer' ? 'Elige dos cuentas diferentes' : 'Elige una categoría para registrar'}</p>}
    </form>
  )
}
