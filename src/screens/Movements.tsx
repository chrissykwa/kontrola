import { FileUp, Search, SearchX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TxRow } from '../components/TxRow'
import { EmptyState, MonthSwitcher } from '../components/ui'
import { currentMonth, dayLabel } from '../lib/dates'
import { formatCLP } from '../lib/money'
import { sortCategories, transactionsOfMonth } from '../lib/stats'
import type { Transaction } from '../lib/types'
import { useCategoryMap, useStore } from '../state/store'
import { useUI } from '../state/ui'

type TypeFilter = 'all' | 'expense' | 'income'

export function Movements() {
  const { data } = useStore()
  const cats = useCategoryMap()
  const ui = useUI()
  const [month, setMonth] = useState(currentMonth())
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    return transactionsOfMonth(data, month)
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => !categoryFilter || t.categoryId === categoryFilter)
      .filter((t) => {
        if (!q) return true
        const catName = t.categoryId ? cats.get(t.categoryId)?.name ?? '' : ''
        return `${t.note} ${catName}`.toLocaleLowerCase('es').includes(q)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [data, month, query, typeFilter, categoryFilter, cats])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) map.set(t.date, [...(map.get(t.date) ?? []), t])
    return [...map.entries()]
  }, [filtered])

  const spent = filtered.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const income = filtered.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const hasFilters = query || typeFilter !== 'all' || categoryFilter

  return (
    <div className="screen screen--movements">
      <header className="topbar">
        <h1 className="topbar__title">Movimientos</h1>
      </header>

      <MonthSwitcher value={month} onChange={setMonth} />
      <button type="button" className="cta" onClick={() => ui.navigate('importar')}><span className="cta__icon"><FileUp size={20} /></span><span className="cta__text"><span className="cta__title">Importar desde el banco</span><span className="muted small">CSV, estado PDF o pantallazos</span></span></button>

      <div className="filters">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar por detalle o categoría"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filters__row">
          <div className="segmented segmented--sm" role="radiogroup" aria-label="Tipo">
            {(
              [
                ['all', 'Todos'],
                ['expense', 'Gastos'],
                ['income', 'Ingresos'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={typeFilter === v}
                className={`segmented__opt ${typeFilter === v ? 'is-active' : ''}`}
                onClick={() => setTypeFilter(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="select">
            <span className="sr-only">Categoría</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas las categorías</option>
              {sortCategories(data.categories)
                .filter((c) => typeFilter === 'all' || c.kind === typeFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div className="summary-strip" aria-live="polite">
        <span>
          {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
        <span>
          {spent > 0 && <span>−{formatCLP(spent)}</span>}
          {income > 0 && <span className="is-income"> +{formatCLP(income)}</span>}
        </span>
      </div>

      {groups.length ? (
        groups.map(([date, txs]) => {
          const dayTotal = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
          return (
            <section key={date} className="day-group" aria-label={dayLabel(date)}>
              <h2 className="day-group__head">
                <span>{dayLabel(date)}</span>
                {dayTotal > 0 && <span className="muted">−{formatCLP(dayTotal)}</span>}
              </h2>
              <ul className="tx-list card card--list">
                {txs.map((t) => (
                  <TxRow key={t.id} tx={t} category={t.categoryId ? cats.get(t.categoryId) : undefined} onSelect={ui.openEditTx} />
                ))}
              </ul>
            </section>
          )
        })
      ) : (
        <EmptyState icon={<SearchX size={24} />} title={hasFilters ? 'Nada coincide con tu búsqueda' : 'Sin movimientos este mes'}>
          {hasFilters ? (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setQuery('')
                setTypeFilter('all')
                setCategoryFilter('')
              }}
            >
              <X size={14} aria-hidden="true" /> Limpiar filtros
            </button>
          ) : (
            'Los gastos e ingresos que registres aparecerán aquí, agrupados por día.'
          )}
        </EmptyState>
      )}
    </div>
  )
}
