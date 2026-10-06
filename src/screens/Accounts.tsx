import { ArrowLeft, ChevronRight, CreditCard, Landmark, Plus, TrendingUp } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { AmountInput } from '../components/AmountInput'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { dateLabel, monthKeyOf, monthLabel, today } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { incomeOccurrences, predictExpenses } from '../lib/planning'
import { accountBalance, creditBills, creditCycle } from '../lib/stats'
import { newId } from '../lib/storage'
import type { IncomeSource, MoneyAccount } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

type Editor = { kind: 'account'; item?: MoneyAccount } | { kind: 'source'; item?: IncomeSource } | null

export function Accounts() {
  const { data, updateSettings } = useStore()
  const ui = useUI()
  const [editor, setEditor] = useState<Editor>(null)
  const predictions = useMemo(() => predictExpenses(data, today()), [data])
  const saveAccount = (item: MoneyAccount) => {
    updateSettings({ accounts: data.settings.accounts.some((a) => a.id === item.id)
      ? data.settings.accounts.map((a) => a.id === item.id ? item : a)
      : [...data.settings.accounts, item] })
    setEditor(null)
  }
  const saveSource = (item: IncomeSource) => {
    updateSettings({ incomeSources: data.settings.incomeSources.some((s) => s.id === item.id)
      ? data.settings.incomeSources.map((s) => s.id === item.id ? item : s)
      : [...data.settings.incomeSources, item] })
    setEditor(null)
  }

  return <div className="screen screen--accounts">
    <header className="topbar topbar--back">
      <button type="button" className="icon-btn icon-btn--surface" onClick={() => ui.navigate('inicio')} aria-label="Volver al inicio"><ArrowLeft size={20} /></button>
      <h1 className="topbar__title">Cuentas y próximos pagos</h1>
    </header>

    <section className="settings-group" aria-labelledby="accounts-title">
      <div className="settings-group__head"><h2 id="accounts-title" className="settings-group__title">Cuentas y tarjetas</h2></div>
      <div className="card card--list">
        {data.settings.accounts.filter((a) => !a.archived).map((a) => {
          const balance = accountBalance(data, a.id)
          const pending = a.kind === 'credit' ? creditBills(data, a.id).filter((b) => b.amount > 0) : []
          return <button type="button" className="settings-row" key={a.id} onClick={() => setEditor({ kind: 'account', item: a })}>
            {a.kind === 'credit' ? <CreditCard size={20} /> : <Landmark size={20} />}
            <span className="settings-row__text"><span>{a.name}</span><span className="muted small">
              {a.kind === 'credit' ? `${pending.length} ciclo(s) pendiente(s) · ${a.cycleOverrides?.length ? 'cortes por mes' : `corte estimado día ${a.closingDay}`}` : 'Cuenta disponible'}
            </span></span>
            <span className="settings-row__value">{a.kind === 'credit' ? `Debes ${formatCLP(Math.max(0, -balance))}` : formatCLP(balance)}</span>
            <ChevronRight size={18} className="muted" />
          </button>
        })}
        <button type="button" className="settings-row settings-row--add" onClick={() => setEditor({ kind: 'account' })}><Plus size={20} /><span className="settings-row__text">Agregar cuenta o tarjeta</span></button>
      </div>
    </section>

    {data.settings.accounts.filter((a) => a.kind === 'credit' && !a.archived).map((a) => {
      const bills = creditBills(data, a.id).filter((b) => b.amount > 0)
      return <section className="settings-group" key={a.id} aria-label={`Próximos pagos de ${a.name}`}>
        <h2 className="settings-group__title">{a.name}: próximos pagos</h2>
        <div className="card card--list">
          {bills.length ? bills.map((b) => <div className="settings-row is-static" key={b.dueDate}>
            <CreditCard size={20} /><span className="settings-row__text"><span>Vence {dateLabel(b.dueDate)}</span><span className="muted small">{b.purchases} cargo(s), incluidas cuotas · calculado desde el corte</span></span>
            <strong>{formatCLP(b.amount)}</strong>
          </div>) : <p className="account-empty">No hay compras pendientes en esta tarjeta.</p>}
        </div>
      </section>
    })}

    <section className="settings-group" aria-labelledby="income-title">
      <h2 id="income-title" className="settings-group__title">Fuentes de ingreso</h2>
      <div className="card card--list">
        {data.settings.incomeSources.filter((s) => !s.archived).map((s) => <button type="button" className="settings-row" key={s.id} onClick={() => setEditor({ kind: 'source', item: s })}>
          <TrendingUp size={20} /><span className="settings-row__text"><span>{s.name}</span><span className="muted small">{s.recurring ? `Cada ${s.intervalMonths} mes(es)` : 'Una vez'} · próximo {dateLabel(incomeOccurrences(s, today(), 1)[0] ?? s.nextDate)}</span></span>
          <span className="settings-row__value">{formatCLP(s.expectedAmount)}</span><ChevronRight size={18} className="muted" />
        </button>)}
        <button type="button" className="settings-row settings-row--add" onClick={() => setEditor({ kind: 'source' })}><Plus size={20} /><span className="settings-row__text">Agregar fuente de ingreso</span></button>
      </div>
      <p className="hint">Los ingresos previstos no aumentan el saldo hasta que los registres como movimiento.</p>
    </section>

    <section className="settings-group" aria-labelledby="predictions-title">
      <h2 id="predictions-title" className="settings-group__title">Posibles gastos próximos</h2>
      <div className="card card--list">
        {predictions.length ? predictions.map((p) => <div key={p.label} className="settings-row is-static">
          <TrendingUp size={20} /><span className="settings-row__text"><span>{p.label}</span><span className="muted small">Visto en {p.occurrences} meses · estimación por historial</span></span><strong>~{formatCLP(p.amount)}</strong>
        </div>) : <p className="account-empty">Cuando repitas compras durante al menos dos meses, verás estimaciones aquí.</p>}
      </div>
    </section>

    <Sheet open={editor !== null} title={editor?.kind === 'account' ? editor.item ? 'Editar cuenta' : 'Nueva cuenta' : editor?.item ? 'Editar fuente' : 'Nueva fuente'} onClose={() => setEditor(null)}>
      {editor?.kind === 'account' && <AccountEditor key={editor.item?.id ?? 'new-account'} item={editor.item} onSave={saveAccount} canArchive={data.settings.accounts.filter((a) => !a.archived).length > 1 && (!editor.item || accountBalance(data, editor.item.id) === 0) && (editor.item?.kind !== 'cash' || data.settings.accounts.some((a) => a.kind === 'cash' && !a.archived && a.id !== editor.item?.id)) && !data.settings.incomeSources.some((s) => !s.archived && s.accountId === editor.item?.id)} />}
      {editor?.kind === 'source' && <SourceEditor key={editor.item?.id ?? 'new-source'} item={editor.item} accounts={data.settings.accounts.filter((a) => a.kind === 'cash' && !a.archived)} onSave={saveSource} />}
    </Sheet>
  </div>
}

function AccountEditor({ item, onSave, canArchive }: { item?: MoneyAccount; onSave: (a: MoneyAccount) => void; canArchive: boolean }) {
  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState<MoneyAccount['kind']>(item?.kind ?? 'cash')
  const [opening, setOpening] = useState<number | null>(Math.abs(item?.openingBalance ?? 0))
  const [closingDay, setClosingDay] = useState(item?.closingDay ?? 25)
  const [dueDay, setDueDay] = useState(item?.dueDay ?? 10)
  const [defaultInstallments, setDefaultInstallments] = useState(item?.defaultInstallments ?? 1)
  const [cycles, setCycles] = useState(item?.cycleOverrides ?? [])
  const [cycleMonth, setCycleMonth] = useState(monthKeyOf(today()))
  const [cycleClose, setCycleClose] = useState('')
  const [cycleDue, setCycleDue] = useState('')
  const toast = useToast()
  const addCycle = () => {
    if (!cycleMonth || !cycleClose || !cycleClose.startsWith(`${cycleMonth}-`) || (cycleDue && cycleDue <= cycleClose)) {
      toast({ message: 'Revisa el mes, la fecha de corte y el vencimiento.' }); return
    }
    setCycles((current) => [...current.filter((c) => c.month !== cycleMonth), { month: cycleMonth, closeDate: cycleClose, dueDate: cycleDue || undefined }].sort((a, b) => a.month.localeCompare(b.month)))
    setCycleClose(''); setCycleDue('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ id: item?.id ?? newId(), name: name.trim(), kind, openingBalance: kind === 'credit' ? -(opening ?? 0) : opening ?? 0,
      closingDay, dueDay, defaultInstallments: kind === 'credit' ? defaultInstallments : undefined,
      cycleOverrides: kind === 'credit' ? cycles : undefined,
      openingDueDate: item?.openingDueDate ?? (kind === 'credit' ? creditCycle(today(), { id: '', name: '', kind, openingBalance: 0, closingDay, dueDay, cycleOverrides: cycles }).dueDate : undefined), archived: item?.archived })
    toast({ message: 'Cuenta guardada' })
  }
  return <form className="form" onSubmit={submit}>
    <div className="field"><label className="field__label" htmlFor="account-name">Nombre</label><input id="account-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Banco Estado o Visa" required /></div>
    <div className="field"><label className="field__label" htmlFor="account-kind">Tipo</label><select id="account-kind" className="input" value={kind} disabled={!!item} onChange={(e) => setKind(e.target.value as MoneyAccount['kind'])}><option value="cash">Cuenta / efectivo</option><option value="credit">Tarjeta de crédito</option></select></div>
    <div className="field"><label className="field__label" htmlFor="opening-account">{kind === 'credit' ? 'Deuda inicial' : 'Saldo inicial'}</label><AmountInput id="opening-account" value={opening} onChange={setOpening} /></div>
    {kind === 'credit' && <><div className="field"><label className="field__label" htmlFor="closing-day">Día de corte estimado</label><input id="closing-day" className="input" type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(Number(e.target.value))} required /></div>
      <div className="field"><label className="field__label" htmlFor="due-day">Día de pago estimado del mes siguiente</label><input id="due-day" className="input" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} required /></div>
      <div className="field"><label className="field__label" htmlFor="default-installments">Cuotas sugeridas por compra <span className="field__optional">(opcional)</span></label><input id="default-installments" className="input" type="number" min="1" max="60" value={defaultInstallments} onChange={(e) => setDefaultInstallments(Number(e.target.value))} /></div>
      <p className="hint">1 = pago único. Por ahora las cuotas siempre se calculan sin interés.</p>
      <div className="field"><strong>Fechas reales por mes</strong><p className="hint">Cuando el banco publique un corte diferente, añádelo aquí. Las fechas estimadas se usan solo en los meses sin fecha real.</p>
        {cycles.map((cycle) => <div className="account-cycle" key={cycle.month}><span>{monthLabel(cycle.month)}: corte {dateLabel(cycle.closeDate)} · vence {cycle.dueDate ? dateLabel(cycle.dueDate) : 'día estimado'}</span><button type="button" className="btn btn--ghost" onClick={() => setCycles((current) => current.filter((c) => c.month !== cycle.month))}>Quitar</button></div>)}
        <label className="field__label" htmlFor="cycle-month">Mes del estado</label><input id="cycle-month" className="input" type="month" value={cycleMonth} onChange={(e) => setCycleMonth(e.target.value)} />
        <label className="field__label" htmlFor="cycle-close">Corte real</label><input id="cycle-close" className="input" type="date" value={cycleClose} onChange={(e) => setCycleClose(e.target.value)} />
        <label className="field__label" htmlFor="cycle-due">Vencimiento real <span className="field__optional">(opcional)</span></label><input id="cycle-due" className="input" type="date" value={cycleDue} onChange={(e) => setCycleDue(e.target.value)} />
        <button type="button" className="btn" onClick={addCycle}>Añadir fecha del mes</button>
      </div>
      <p className="hint">Cambiar un corte pasado recalcula a qué estado pertenecen las compras anteriores. Los días 29–31 estimados se ajustan a cada mes.</p></>}
    <button type="submit" className="btn btn--primary btn--block">Guardar cuenta</button>
    {item && canArchive && <button type="button" className="btn btn--danger-ghost" onClick={() => onSave({ ...item, archived: true })}>Archivar cuenta</button>}
    {item && !canArchive && <p className="hint">Para archivar esta cuenta, primero deja su saldo en cero y cambia las fuentes de ingreso vinculadas.</p>}
  </form>
}

function SourceEditor({ item, accounts, onSave }: { item?: IncomeSource; accounts: MoneyAccount[]; onSave: (s: IncomeSource) => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState<number | null>(item?.expectedAmount ?? null)
  const [accountId, setAccountId] = useState(item?.accountId ?? accounts[0]?.id ?? '')
  const [nextDate, setNextDate] = useState(item?.nextDate ?? today())
  const [recurring, setRecurring] = useState(item?.recurring ?? true)
  const [intervalMonths, setIntervalMonths] = useState(item?.intervalMonths ?? 1)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !accountId) return
    onSave({ id: item?.id ?? newId(), name: name.trim(), expectedAmount: amount ?? 0, accountId, nextDate, recurring, intervalMonths, archived: item?.archived })
  }
  return <form className="form" onSubmit={submit}>
    <div className="field"><label className="field__label" htmlFor="source-name">Fuente</label><input id="source-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: sueldo, arriendo, freelance" required /></div>
    <div className="field"><label className="field__label" htmlFor="source-amount">Monto esperado</label><AmountInput id="source-amount" value={amount} onChange={setAmount} /></div>
    <div className="field"><label className="field__label" htmlFor="source-account">Cuenta donde llega</label><select id="source-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
    <div className="field"><label className="field__label" htmlFor="source-date">Próxima fecha esperada</label><input id="source-date" className="input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} required /></div>
    <label className="check"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Se repite</label>
    {recurring && <div className="field"><label className="field__label" htmlFor="source-interval">Cada cuántos meses</label><input id="source-interval" className="input" type="number" min="1" max="60" value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))} required /></div>}
    <button type="submit" className="btn btn--primary btn--block">Guardar fuente</button>
    {item && <button type="button" className="btn btn--danger-ghost" onClick={() => onSave({ ...item, archived: true })}>Archivar fuente</button>}
  </form>
}
