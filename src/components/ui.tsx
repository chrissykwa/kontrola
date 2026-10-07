import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { currentMonth, monthLabel, shiftMonth, type MonthKey } from '../lib/dates'
import type { ReactNode } from 'react'
import { formatCLP } from '../lib/money'

/** `max`: último mes al que se puede avanzar (por defecto el actual; más allá si hay cuotas de tarjeta por pagar). */
export function MonthSwitcher({ value, onChange, max }: { value: MonthKey; onChange: (m: MonthKey) => void; max?: MonthKey }) {
  const isCurrent = value === currentMonth()
  const last = max && max > currentMonth() ? max : currentMonth()
  return (
    <div className="month-switcher">
      <button type="button" className="icon-btn" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Mes anterior">
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="month-switcher__label"
        onClick={() => onChange(currentMonth())}
        disabled={isCurrent}
        aria-label={isCurrent ? monthLabel(value) : `${monthLabel(value)}. Volver al mes actual`}
      >
        {monthLabel(value)}
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Mes siguiente"
        disabled={value >= last}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

type Status = 'none' | 'ok' | 'warning' | 'over'

/** Barra de progreso de presupuesto: el relleno lleva el estado, el riel es un tono más claro del mismo color. */
export function Meter({ value, max, status, label }: { value: number; max: number; status: Status; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <span
      className={`meter meter--${status}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={max > 0 ? `${formatCLP(value)} de ${formatCLP(max)}` : formatCLP(value)}
    >
      <span className="meter__fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

/** Etiqueta de estado: siempre ícono + texto, nunca solo color. */
export function StatusBadge({ status }: { status: Status }) {
  if (status === 'none') return null
  const map = {
    ok: { Icon: CircleCheck, text: 'Vas bien' },
    warning: { Icon: TriangleAlert, text: 'Ojo' },
    over: { Icon: CircleAlert, text: 'Te pasaste' },
  } as const
  const { Icon, text } = map[status]
  return (
    <span className={`badge badge--${status}`}>
      <Icon size={14} aria-hidden="true" />
      {text}
    </span>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <p className="empty__title">{title}</p>
      {children && <p className="empty__text">{children}</p>}
    </div>
  )
}
