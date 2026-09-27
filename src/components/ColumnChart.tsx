import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { formatCLP, formatCompact } from '../lib/money'

export interface Column {
  key: string
  /** Etiqueta corta del eje (ej: "12" o "sept"). */
  label: string
  /** Etiqueta larga para el tooltip (ej: "Viernes 12 de septiembre"). */
  title: string
  value: number
  /** Resalta la columna (mes actual, día de hoy). */
  highlight?: boolean
}

const PAD = { top: 16, right: 8, bottom: 24, left: 44 }

/** Redondea el máximo del eje a un número "limpio" (1, 2, 2.5, 5 × 10^n). */
function niceMax(v: number): number {
  if (v <= 0) return 1000
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

/**
 * Gráfico de columnas de una sola serie. Columnas finas (≤ 24px) con punta redondeada,
 * grilla recesiva, tooltip al pasar/tocar y navegación con flechas del teclado.
 */
export function ColumnChart({
  columns,
  height = 180,
  refLine,
  labelEvery = 1,
  ariaLabel,
}: {
  columns: Column[]
  height?: number
  refLine?: { value: number; label: string }
  labelEvery?: number
  ariaLabel: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [active, setActive] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Si cambian los datos (otro mes), se limpia la selección.
  useEffect(() => setActive(null), [columns.length, columns[0]?.key])

  const max = niceMax(Math.max(...columns.map((c) => c.value), refLine?.value ?? 0))
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const step = columns.length ? innerW / columns.length : 0
  const barW = Math.max(3, Math.min(24, step * 0.62))
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const r = Math.min(4, barW / 2)

  const onKey = (e: KeyboardEvent) => {
    if (!columns.length) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const delta = e.key === 'ArrowRight' ? 1 : -1
      setActive((a) => Math.min(columns.length - 1, Math.max(0, (a ?? (delta > 0 ? -1 : columns.length)) + delta)))
    } else if (e.key === 'Escape') setActive(null)
  }

  const highlightIndex = columns.findIndex((c) => c.highlight)
  const activeCol = active !== null ? columns[active] : null
  const tipX = active !== null ? PAD.left + step * active + step / 2 : 0

  return (
    <div className="chart" ref={wrap}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart__tick" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {columns.map((c, i) => {
          const x = PAD.left + step * i + (step - barW) / 2
          const h = Math.max(0, (c.value / max) * innerH)
          const top = PAD.top + innerH - h
          const bottom = PAD.top + innerH
          // Punta redondeada arriba, base recta.
          const d =
            h <= 0
              ? ''
              : h < r
                ? `M${x},${bottom}V${top}H${x + barW}V${bottom}Z`
                : `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${bottom}Z`
          return (
            <g key={c.key}>
              {d && (
                <path
                  d={d}
                  className={`chart__bar ${c.highlight ? 'is-highlight' : ''} ${active === i ? 'is-active' : ''} ${
                    active !== null && active !== i ? 'is-dim' : ''
                  }`}
                />
              )}
              {(i % labelEvery === 0 && (highlightIndex < 0 || Math.abs(i - highlightIndex) >= 2)) || c.highlight ? (
                <text className={`chart__label ${c.highlight ? 'is-highlight' : ''}`} x={x + barW / 2} y={height - 6} textAnchor="middle">
                  {c.label}
                </text>
              ) : null}
              {/* Zona de toque más grande que la columna */}
              <rect
                x={PAD.left + step * i}
                y={PAD.top}
                width={step}
                height={innerH}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          )
        })}

        {refLine && refLine.value > 0 && refLine.value <= max && (
          <g className="chart__ref" pointerEvents="none">
            <line x1={PAD.left} x2={width - PAD.right} y1={y(refLine.value)} y2={y(refLine.value)} />
            <text x={width - PAD.right} y={y(refLine.value) - 5} textAnchor="end">
              {refLine.label}
            </text>
          </g>
        )}

        <line className="chart__axis" x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} />
      </svg>

      {activeCol && (
        <div
          className="chart__tooltip"
          style={{
            left: Math.min(Math.max(tipX, 70), width - 70),
            top: Math.max(0, y(activeCol.value) - 8),
          }}
          role="status"
        >
          <span className="chart__tooltip-title">{activeCol.title}</span>
          <strong>{formatCLP(activeCol.value)}</strong>
        </div>
      )}
    </div>
  )
}
