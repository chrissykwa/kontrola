import { ChevronRight, CircleAlert, CreditCard, Plus, Settings as SettingsIcon, Target } from 'lucide-react'
import { useMemo } from 'react'
import { CategoryIcon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { TxRow } from '../components/TxRow'
import { EmptyState, Meter } from '../components/ui'
import { currentMonth, dateLabel, monthLabel, today } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { incomeOccurrences } from '../lib/planning'
import { accountBalance, budgetStatus, creditBills, currentBalance, monthPace, monthSummary } from '../lib/stats'
import { useCategoryMap, useStore } from '../state/store'
import { useUI } from '../state/ui'

export function Home() {
  const { data } = useStore()
  const cats = useCategoryMap()
  const ui = useUI()
  const month = currentMonth()

  const balance = currentBalance(data)
  const cards = data.settings.accounts.filter((a) => a.kind === 'credit' && !a.archived)
  const hasCards = cards.length > 0
  const cardDebt = cards.reduce((sum, a) => sum + Math.max(0, -accountBalance(data, a.id)), 0)
  const nextCardBill = cards
    .flatMap((a) => creditBills(data, a.id))
    .filter((b) => b.amount > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  // Si no hay pagos de tarjeta pendientes, se muestra el próximo ingreso esperado.
  const nextIncome = data.settings.incomeSources
    .map((s) => ({ name: s.name, amount: s.expectedAmount, date: incomeOccurrences(s, today(), 1)[0] }))
    .filter((s) => s.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const summary = useMemo(() => monthSummary(data, month), [data, month])
  const pace = monthPace(data, month, today())
  const monthName = monthLabel(month).split(' ')[0].toLowerCase()

  const recent = useMemo(
    () =>
      [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [data.transactions],
  )

  const topCategories = [...summary.byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="screen screen--home">
      <header className="topbar">
        <div className="brand">
          <Logo size={32} />
          <span className="brand__name">Kontrola</span>
        </div>
        <h1 className="home-desktop-title">Resumen</h1>
        <button type="button" className="icon-btn" onClick={() => ui.navigate('ajustes')} aria-label="Ajustes">
          <SettingsIcon size={22} />
        </button>
      </header>

      <section className="hero" aria-labelledby="balance-label">
        <p id="balance-label" className="hero__label">
          Saldo disponible
        </p>
        <p className={`hero__value ${balance < 0 ? 'is-negative' : ''}`}>{formatCLP(balance)}</p>
        <p className="hero__month">
          En {monthName}: <span className="is-income">+{formatCLP(summary.income)}</span> ·{' '}
          <span>−{formatCLP(summary.spent)}</span>
        </p>
      </section>

      <button type="button" className="accounts-card home__accounts" onClick={() => ui.navigate('cuentas')}>
        <span className="accounts-card__head">
          <span className="accounts-card__icon" aria-hidden="true">
            <CreditCard size={18} />
          </span>
          <span className="accounts-card__title">Cuentas y tarjetas</span>
          <ChevronRight size={18} className="muted" aria-hidden="true" />
        </span>
        <span className="accounts-card__tiles">
          <span className="accounts-card__tile">
            <span className="accounts-card__label">{hasCards ? 'Deuda en tarjetas' : 'Tarjetas'}</span>
            {hasCards ? (
              <span className="accounts-card__value">{formatCLP(cardDebt)}</span>
            ) : (
              <span className="accounts-card__value accounts-card__value--soft">
                <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> Agregar
              </span>
            )}
          </span>
          <span className="accounts-card__tile">
            {nextCardBill ? (
              <>
                <span className="accounts-card__label">Próximo pago · {dateLabel(nextCardBill.dueDate)}</span>
                <span className="accounts-card__value">{formatCLP(nextCardBill.amount)}</span>
              </>
            ) : nextIncome ? (
              <>
                <span className="accounts-card__label">{nextIncome.name} · {dateLabel(nextIncome.date)}</span>
                <span className="accounts-card__value is-income">+{formatCLP(nextIncome.amount)}</span>
              </>
            ) : (
              <>
                <span className="accounts-card__label">Próximos pagos</span>
                <span className="accounts-card__value accounts-card__value--soft">Al día</span>
              </>
            )}
          </span>
        </span>
      </button>

      {pace.budget > 0 ? (
        <button type="button" className="budget-strip home__budget" onClick={() => ui.navigate('presupuesto')}>
          <span className="budget-strip__top">
            <span className="muted">Presupuesto de {monthName}</span>
            <span>
              <strong>{formatCLP(pace.spent)}</strong>
              <span className="muted"> de {formatCLP(pace.budget)}</span>
            </span>
          </span>
          <Meter value={pace.spent} max={pace.budget} status={pace.status} label="Gastado del presupuesto del mes" />
          {pace.status === 'over' && (
            <span className="budget-strip__over">
              <CircleAlert size={14} aria-hidden="true" />
              Te pasaste por {formatCLP(-pace.remaining)}
            </span>
          )}
        </button>
      ) : (
        <button type="button" className="cta home__budget" onClick={() => ui.navigate('presupuesto')}>
          <span className="cta__icon" aria-hidden="true">
            <Target size={20} />
          </span>
          <span className="cta__text">
            <span className="cta__title">Define tu presupuesto</span>
            <span className="muted small">Así sabrás cuánto puedes gastar cada día</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" className="muted" />
        </button>
      )}

      {topCategories.length > 0 && (
        <section className="section home__categories" aria-labelledby="cats-title">
          <div className="section__head">
            <h2 id="cats-title" className="section__title">
              En qué se va la plata
            </h2>
            <button type="button" className="link-btn" onClick={() => ui.navigate('analisis')}>
              Ver más
            </button>
          </div>
          <ul className="cat-list">
            {topCategories.map(([id, spent]) => {
              const c = cats.get(id)
              const budget = c?.budget ?? 0
              return (
                <li key={id}>
                  <button type="button" className="cat-list__item rank__item--btn" onClick={() => ui.openCategory(id, month)}>
                  <CategoryIcon category={c} size="sm" />
                  <div className="cat-list__main">
                    <div className="cat-list__row">
                      <span className="cat-list__name">{c?.name ?? 'Sin categoría'}</span>
                      <span className="cat-list__amount">{formatCLP(spent)}</span>
                    </div>
                    {budget > 0 && (
                      <Meter value={spent} max={budget} status={budgetStatus(spent, budget)} label={`Presupuesto ${c?.name}`} />
                    )}
                  </div>
                  <ChevronRight size={16} className="rank__chevron" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className={`section home__recent ${topCategories.length ? '' : 'home__recent--wide'}`} aria-labelledby="recent-title">
        <div className="section__head">
          <h2 id="recent-title" className="section__title">
            Últimos movimientos
          </h2>
          {recent.length > 0 && (
            <button type="button" className="link-btn" onClick={() => ui.navigate('movimientos')}>
              Ver todos
            </button>
          )}
        </div>
        {recent.length ? (
          <ul className="tx-list tx-list--plain">
            {recent.map((t) => (
              <TxRow key={t.id} tx={t} category={t.categoryId ? cats.get(t.categoryId) : undefined} showDate onSelect={ui.openEditTx} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Plus size={24} />} title="Aún no registras gastos">
            Toca <strong>+</strong> cada vez que gastes algo. Toma 5 segundos.
          </EmptyState>
        )}
      </section>
    </div>
  )
}
