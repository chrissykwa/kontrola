import { useMemo } from 'react'
import { monthLabel, type MonthKey } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { budgetStatus, categoryBreakdown, monthSummary } from '../lib/stats'
import type { Transaction } from '../lib/types'
import { useCategoryMap, useStore } from '../state/store'
import { CategoryIcon } from './Icon'
import { TxRow } from './TxRow'
import { Meter } from './ui'

/** Cuántos detalles mostrar en "En qué se fue" antes de que la lista completa haga el resto. */
const TOP_DETAILS = 5

/** Desglose de una categoría en un mes: total, en qué se fue y todos los gastos. */
export function CategoryDetail({
  categoryId,
  month,
  onSelectTx,
}: {
  categoryId: string
  month: MonthKey
  onSelectTx: (tx: Transaction) => void
}) {
  const { data } = useStore()
  const cats = useCategoryMap()
  const category = cats.get(categoryId)
  const breakdown = useMemo(() => categoryBreakdown(data, month, categoryId), [data, month, categoryId])
  const monthSpent = useMemo(() => monthSummary(data, month).spent, [data, month])

  const { entries, total, byDetail } = breakdown
  const share = monthSpent > 0 ? Math.round((total / monthSpent) * 100) : 0
  const budget = category?.budget ?? 0
  // Solo vale la pena si hay algo que se repite; si cada gasto es distinto, la lista ya lo dice todo.
  const showDetails = byDetail.length > 1 && byDetail.some((g) => g.count > 1)
  const topDetail = byDetail[0]?.total ?? 0

  return (
    <div className="cat-detail">
      <div className="cat-detail__summary">
        <CategoryIcon category={category} />
        <div>
          <p className="cat-detail__total">{formatCLP(total)}</p>
          <p className="muted small">
            {entries.length} {entries.length === 1 ? 'gasto' : 'gastos'} en {monthLabel(month).toLowerCase()}
            {share > 0 && ` · ${share}% de lo que gastaste`}
          </p>
        </div>
      </div>

      {budget > 0 && (
        <div className="cat-detail__budget">
          <Meter value={total} max={budget} status={budgetStatus(total, budget)} label={`Presupuesto ${category?.name}`} />
          <p className="muted small">
            {total <= budget
              ? `Te quedan ${formatCLP(budget - total)} de ${formatCLP(budget)}`
              : `Te pasaste por ${formatCLP(total - budget)} (presupuesto ${formatCLP(budget)})`}
          </p>
        </div>
      )}

      {showDetails && (
        <section aria-labelledby="cat-detail-groups">
          <h3 id="cat-detail-groups" className="cat-detail__heading">
            En qué se fue
          </h3>
          <ul className="rank">
            {byDetail.slice(0, TOP_DETAILS).map((g) => (
              <li key={g.label} className="rank__item">
                <div className="rank__main">
                  <div className="rank__row">
                    <span className="rank__name">
                      {g.label}
                      {g.count > 1 && <span className="muted"> ×{g.count}</span>}
                    </span>
                    <span className="rank__value">{formatCLP(g.total)}</span>
                  </div>
                  <span className="rank__track" aria-hidden="true">
                    <span className="rank__bar" style={{ width: `${topDetail ? (g.total / topDetail) * 100 : 0}%` }} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cat-detail-list">
        <h3 id="cat-detail-list" className="cat-detail__heading">
          Todos los gastos
        </h3>
        {entries.length ? (
          <ul className="tx-list tx-list--plain">
            {entries.map((e) => (
              <TxRow
                key={`${e.tx.id}-${e.date}`}
                tx={e.tx}
                entry={e}
                category={category}
                showDate
                showCategory={false}
                onSelect={onSelectTx}
              />
            ))}
          </ul>
        ) : (
          <p className="muted small">No hay gastos en esta categoría este mes.</p>
        )}
      </section>
    </div>
  )
}
