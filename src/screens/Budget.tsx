import { ChevronRight, Info } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { AmountInput } from '../components/AmountInput'
import { CategoryIcon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { Meter, MonthSwitcher, StatusBadge } from '../components/ui'
import { currentMonth, monthLabel, today } from '../lib/dates'
import { formatCLP, formatDigits } from '../lib/money'
import { budgetStatus, categoryBudgetSum, expenseCategories, monthPace, monthSummary } from '../lib/stats'
import type { Category } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

export function Budget() {
  const { data, updateSettings, upsertCategory } = useStore()
  const toast = useToast()
  const ui = useUI()
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState<Category | 'total' | null>(null)
  const [draft, setDraft] = useState<number | null>(null)

  const summary = useMemo(() => monthSummary(data, month), [data, month])
  const pace = monthPace(data, month, today())
  const catSum = categoryBudgetSum(data)
  const total = data.settings.monthlyBudget
  const categories = expenseCategories(data)
    .map((c) => ({ c, spent: summary.byCategory.get(c.id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent || b.c.budget - a.c.budget)

  const open = (target: Category | 'total') => {
    setEditing(target)
    setDraft(target === 'total' ? total : target.budget || null)
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (editing === 'total') {
      updateSettings({ monthlyBudget: draft })
      toast({ message: draft ? `Presupuesto mensual: ${formatCLP(draft)}` : 'Presupuesto total según categorías' })
    } else if (editing) {
      upsertCategory({ ...editing, budget: draft ?? 0 })
      toast({ message: `${editing.name}: ${draft ? formatCLP(draft) : 'sin presupuesto'}` })
    }
    setEditing(null)
  }

  const isCurrent = month === currentMonth()

  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="topbar__title">Presupuesto</h1>
      </header>

      <MonthSwitcher value={month} onChange={setMonth} />

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Total del mes</h2>
          <StatusBadge status={pace.status} />
        </div>
        {pace.budget > 0 ? (
          <>
            <p className="budget-line">
              <strong>{formatCLP(pace.spent)}</strong>
              <span className="muted"> de {formatCLP(pace.budget)}</span>
            </p>
            <Meter value={pace.spent} max={pace.budget} status={pace.status} label="Presupuesto total del mes" />
            <p className="muted small">
              {pace.remaining >= 0
                ? isCurrent
                  ? `Te quedan ${formatCLP(pace.remaining)} · ${formatCLP(pace.perDay)} por día`
                  : `Sobraron ${formatCLP(pace.remaining)}`
                : `Te pasaste por ${formatCLP(-pace.remaining)}`}
            </p>
          </>
        ) : (
          <p className="muted">Aún no defines cuánto quieres gastar al mes.</p>
        )}
        <button type="button" className="card__edit" onClick={() => open('total')}>
          <span className="muted">{total ? 'Monto fijo' : catSum ? 'Suma de categorías' : 'Sin definir'}</span>
          <span>{pace.budget > 0 ? 'Editar total' : 'Definir total'}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </section>

      {total !== null && catSum > total && (
        <p className="alert alert--warning">
          <Info size={16} aria-hidden="true" />
          <span>
            Tus categorías suman {formatCLP(catSum)}, más que tu total de {formatCLP(total)}.
          </span>
        </p>
      )}

      <section className="card card--list">
        <div className="card__head">
          <h2 className="card__title">Por categoría</h2>
          <span className="muted small">Toca para editar</span>
        </div>
        <ul className="budget-list">
          {categories.map(({ c, spent }) => {
            const status = budgetStatus(spent, c.budget)
            return (
              <li key={c.id}>
                <button type="button" className="budget-row" onClick={() => open(c)}>
                  <CategoryIcon category={c} />
                  <span className="budget-row__main">
                    <span className="budget-row__top">
                      <span className="budget-row__name">{c.name}</span>
                      <span className="budget-row__amount">{formatCLP(spent)}</span>
                    </span>
                    {c.budget > 0 ? (
                      <span className="budget-row__meter">
                        <Meter value={spent} max={c.budget} status={status} label={`Presupuesto ${c.name}`} />
                        <span className={`budget-row__limit ${status === 'over' ? 'is-over' : ''}`}>
                          {status === 'over' ? `+${formatCLP(spent - c.budget)} sobre ` : 'de '}
                          {formatCLP(c.budget)}
                        </span>
                      </span>
                    ) : (
                      <span className="muted small">Sin presupuesto · toca para definir</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <Sheet
        open={editing !== null}
        title={editing === 'total' ? 'Presupuesto mensual' : editing ? `Presupuesto · ${editing.name}` : ''}
        onClose={() => setEditing(null)}
      >
        <form className="form" onSubmit={save}>
          <div className="field">
            <label htmlFor="budget-input" className="field__label">
              ¿Cuánto quieres gastar al mes{editing && editing !== 'total' ? ` en ${editing.name.toLowerCase()}` : ''}?
            </label>
            <AmountInput id="budget-input" value={draft} onChange={setDraft} autoFocus describedBy="budget-help" />
            <p id="budget-help" className="hint">
              {editing === 'total'
                ? catSum
                  ? `Si lo dejas vacío, se usa la suma de tus categorías (${formatCLP(catSum)}).`
                  : 'Déjalo vacío si prefieres armarlo por categoría.'
                : 'Déjalo vacío para no ponerle límite a esta categoría.'}
            </p>
          </div>
          {editing === 'total' && catSum > 0 && (
            <button type="button" className="chip" onClick={() => setDraft(catSum)}>
              Usar suma de categorías · ${formatDigits(catSum)}
            </button>
          )}
          <button type="submit" className="btn btn--primary btn--block">
            Guardar
          </button>
          {editing && editing !== 'total' && (summary.byCategory.get(editing.id) ?? 0) > 0 && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                const id = editing.id
                setEditing(null)
                ui.openCategory(id, month)
              }}
            >
              Ver en qué se gastó en {monthLabel(month).split(' ')[0].toLowerCase()}
            </button>
          )}
        </form>
      </Sheet>
    </div>
  )
}
