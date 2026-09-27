import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Scale, Settings as SettingsIcon, Target } from 'lucide-react'
import { useMemo } from 'react'
import { CategoryIcon } from '../components/Icon'
import { TxRow } from '../components/TxRow'
import { EmptyState, Meter, StatusBadge } from '../components/ui'
import { currentMonth, monthLabel, today } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { budgetStatus, currentBalance, monthPace, monthSummary } from '../lib/stats'
import { useCategoryMap, useStore } from '../state/store'
import { useUI } from '../state/ui'

export function Home() {
  const { data } = useStore()
  const cats = useCategoryMap()
  const ui = useUI()
  const month = currentMonth()

  const balance = currentBalance(data)
  const summary = useMemo(() => monthSummary(data, month), [data, month])
  const pace = monthPace(data, month, today())

  const recent = useMemo(
    () =>
      [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 6),
    [data.transactions],
  )

  const topCategories = [...summary.byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="topbar__eyebrow">{monthLabel(month)}</p>
          <h1 className="topbar__title">Kontrola</h1>
        </div>
        <button type="button" className="icon-btn icon-btn--surface" onClick={() => ui.navigate('ajustes')} aria-label="Ajustes">
          <SettingsIcon size={20} />
        </button>
      </header>

      <section className="hero" aria-labelledby="balance-label">
        <div className="hero__top">
          <p id="balance-label" className="hero__label">
            Saldo disponible
          </p>
          <button type="button" className="hero__adjust" onClick={ui.openAdjust}>
            <Scale size={14} aria-hidden="true" />
            Cuadrar con banco
          </button>
        </div>
        <p className={`hero__value ${balance < 0 ? 'is-negative' : ''}`}>{formatCLP(balance)}</p>
        <div className="hero__stats">
          <div>
            <span className="hero__stat-label">
              <ArrowDownLeft size={14} aria-hidden="true" /> Ingresos
            </span>
            <span className="hero__stat-value">{formatCLP(summary.income)}</span>
          </div>
          <div>
            <span className="hero__stat-label">
              <ArrowUpRight size={14} aria-hidden="true" /> Gastos
            </span>
            <span className="hero__stat-value">{formatCLP(summary.spent)}</span>
          </div>
        </div>
      </section>

      {pace.budget > 0 ? (
        <section className={`today ${pace.status === 'over' ? 'today--over' : ''}`} aria-labelledby="today-label">
          <div className="today__head">
            <p id="today-label" className="today__label">
              {pace.status === 'over' ? 'Te pasaste del presupuesto' : 'Puedes gastar hoy'}
            </p>
            <StatusBadge status={pace.status} />
          </div>
          <p className="today__value">{formatCLP(pace.status === 'over' ? -pace.remaining : pace.perDay)}</p>
          <div className="today__meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (pace.spent / pace.budget) * 100)}%` }} />
          </div>
          <p className="today__sub">
            {pace.status === 'over' ? (
              <>
                Llevas {formatCLP(pace.spent)} de {formatCLP(pace.budget)}. Revisa en qué categorías se fue.
              </>
            ) : (
              <>
                Te quedan <strong>{formatCLP(pace.remaining)}</strong> de {formatCLP(pace.budget)} para {pace.daysLeft}{' '}
                {pace.daysLeft === 1 ? 'día' : 'días'}
              </>
            )}
          </p>
        </section>
      ) : (
        <button type="button" className="card card--cta" onClick={() => ui.navigate('presupuesto')}>
          <span className="card--cta__icon" aria-hidden="true">
            <Target size={22} />
          </span>
          <span>
            <span className="card__title">Define tu presupuesto mensual</span>
            <span className="muted block">Así sabrás cuánto puedes gastar por día.</span>
          </span>
          <ChevronRight size={20} aria-hidden="true" className="muted" />
        </button>
      )}

      {topCategories.length > 0 && (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">¿En qué se va la plata?</h2>
            <button type="button" className="link-btn" onClick={() => ui.navigate('analisis')}>
              Ver análisis
            </button>
          </div>
          <ul className="cat-list">
            {topCategories.map(([id, spent]) => {
              const c = cats.get(id)
              const budget = c?.budget ?? 0
              const status = budgetStatus(spent, budget)
              return (
                <li key={id} className="cat-list__item">
                  <CategoryIcon category={c} size="sm" />
                  <div className="cat-list__main">
                    <div className="cat-list__row">
                      <span className="cat-list__name">{c?.name ?? 'Sin categoría'}</span>
                      <span className="cat-list__amount">{formatCLP(spent)}</span>
                    </div>
                    {budget > 0 && (
                      <div className="budget-row__meter">
                        <Meter value={spent} max={budget} status={status} label={`Presupuesto ${c?.name}`} />
                        <span className="budget-row__limit">de {formatCLP(budget)}</span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="card card--list">
        <div className="card__head">
          <h2 className="card__title">Últimos movimientos</h2>
          {recent.length > 0 && (
            <button type="button" className="link-btn" onClick={() => ui.navigate('movimientos')}>
              Ver todos
            </button>
          )}
        </div>
        {recent.length ? (
          <ul className="tx-list">
            {recent.map((t) => (
              <TxRow key={t.id} tx={t} category={t.categoryId ? cats.get(t.categoryId) : undefined} showDate onSelect={ui.openEditTx} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Plus size={24} />} title="Aún no registras gastos">
            Toca el botón <strong>+</strong> cada vez que gastes algo. Toma 5 segundos.
          </EmptyState>
        )}
      </section>
    </div>
  )
}
