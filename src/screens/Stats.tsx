import { BarChart3, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ColumnChart, type Column } from '../components/ColumnChart'
import { CategoryIcon } from '../components/Icon'
import { EmptyState, MonthSwitcher } from '../components/ui'
import { currentMonth, daysInMonth, dayLabel, monthLabel, monthShortLabel, shiftMonth, today } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { lastSpendMonth, monthlyTotals, monthSummary, spendEntriesOfMonth, totalBudget } from '../lib/stats'
import { useCategoryMap, useStore } from '../state/store'
import { useUI } from '../state/ui'

export function Stats() {
  const { data } = useStore()
  const cats = useCategoryMap()
  const ui = useUI()
  const [month, setMonth] = useState(currentMonth())

  const summary = useMemo(() => monthSummary(data, month), [data, month])
  const prev = useMemo(() => monthSummary(data, shiftMonth(month, -1)), [data, month])
  const history = useMemo(() => monthlyTotals(data, month, 6), [data, month])
  const budget = totalBudget(data)

  const isCurrent = month === currentMonth()
  const days = daysInMonth(month)
  const elapsedDays = isCurrent ? Number(today().slice(8, 10)) : days
  const dailyAvg = elapsedDays > 0 ? summary.spent / elapsedDays : 0

  // Comparación justa: si es el mes en curso, contra el mismo tramo del mes anterior.
  const prevComparable = isCurrent ? prev.daily.slice(0, elapsedDays).reduce((a, b) => a + b, 0) : prev.spent
  const delta = prevComparable > 0 ? (summary.spent - prevComparable) / prevComparable : null

  // Lo que más pesó este mes (con tarjeta, la cuota que vence este mes).
  const biggest = useMemo(() => {
    const top = [...spendEntriesOfMonth(data, month)].sort((a, b) => b.amount - a.amount)[0]
    return top && { ...top.tx, amount: top.amount }
  }, [data, month])

  const ranked = [...summary.byCategory.entries()].sort((a, b) => b[1] - a[1])
  const topValue = ranked[0]?.[1] ?? 0

  const dailyColumns: Column[] = summary.daily.map((v, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`
    return { key: date, label: String(i + 1), title: dayLabel(date), value: v, highlight: date === today() }
  })

  const historyColumns: Column[] = history.map((h) => ({
    key: h.key,
    label: monthShortLabel(h.key),
    title: monthLabel(h.key),
    value: h.spent,
    highlight: h.key === month,
  }))

  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="topbar__title">Análisis</h1>
      </header>

      <MonthSwitcher value={month} onChange={setMonth} max={lastSpendMonth(data, currentMonth())} />

      {summary.expenseCount === 0 ? (
        <EmptyState icon={<BarChart3 size={24} />} title="Sin gastos en este mes">
          Cuando registres gastos verás aquí en qué se te va la plata.
        </EmptyState>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <span className="tile__label">Gastado</span>
              <span className="tile__value">{formatCLP(summary.spent)}</span>
              {delta !== null && (
                <span className={`tile__delta ${delta > 0 ? 'is-up' : 'is-down'}`}>
                  {delta > 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
                  {delta > 0 ? '+' : '−'}
                  {Math.abs(Math.round(delta * 100))}% vs {monthShortLabel(shiftMonth(month, -1))}
                </span>
              )}
            </div>
            <div className="tile">
              <span className="tile__label">Promedio diario</span>
              <span className="tile__value">{formatCLP(dailyAvg)}</span>
              {budget > 0 && <span className="tile__sub">Ideal: {formatCLP(budget / days)}</span>}
            </div>
            <div className="tile">
              <span className="tile__label">Movimientos</span>
              <span className="tile__value">{summary.expenseCount}</span>
              <span className="tile__sub">gastos registrados</span>
            </div>
            {biggest && (
              <div className="tile">
                <span className="tile__label">Gasto más grande</span>
                <span className="tile__value">{formatCLP(biggest.amount)}</span>
                <span className="tile__sub truncate">
                  {biggest.note || (biggest.categoryId && cats.get(biggest.categoryId)?.name) || 'Sin detalle'}
                </span>
              </div>
            )}
          </div>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Gasto por día</h2>
            </div>
            <ColumnChart
              columns={dailyColumns}
              labelEvery={5}
              refLine={budget > 0 ? { value: budget / days, label: 'ideal por día' } : undefined}
              ariaLabel={`Gasto por día en ${monthLabel(month)}. Usa las flechas para recorrer los días.`}
            />
            <details className="data-table">
              <summary>Ver como tabla</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Día</th>
                    <th scope="col">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyColumns
                    .filter((c) => c.value > 0)
                    .map((c) => (
                      <tr key={c.key}>
                        <td>{c.title}</td>
                        <td>{formatCLP(c.value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Por categoría</h2>
              <span className="muted small">Toca para ver el detalle</span>
            </div>
            <ul className="rank">
              {ranked.map(([id, value]) => {
                const c = cats.get(id)
                const share = summary.spent > 0 ? value / summary.spent : 0
                return (
                  <li key={id}>
                    <button type="button" className="rank__item rank__item--btn" onClick={() => ui.openCategory(id, month)}>
                    <CategoryIcon category={c} size="sm" />
                    <div className="rank__main">
                      <div className="rank__row">
                        <span className="rank__name">{c?.name ?? 'Sin categoría'}</span>
                        <span className="rank__value">
                          {formatCLP(value)} <span className="muted">· {Math.round(share * 100)}%</span>
                        </span>
                      </div>
                      <span className="rank__track" aria-hidden="true">
                        <span className="rank__bar" style={{ width: `${topValue ? (value / topValue) * 100 : 0}%` }} />
                      </span>
                    </div>
                    <ChevronRight size={16} className="rank__chevron" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      {history.some((h) => h.spent > 0) && (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Últimos 6 meses</h2>
          </div>
          <ColumnChart
            columns={historyColumns}
            height={160}
            refLine={budget > 0 ? { value: budget, label: 'presupuesto' } : undefined}
            ariaLabel="Gasto total de los últimos 6 meses. Usa las flechas para recorrer los meses."
          />
        </section>
      )}
    </div>
  )
}
