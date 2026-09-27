/** Logo de Kontrola: una "K" sobre un anillo de progreso (gasto vs presupuesto). */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c5f04a" />
          <stop offset="1" stopColor="#a6d93a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0f110d" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#2d3128" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke="url(#kg)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="99 132"
        transform="rotate(-90 32 32)"
      />
      <path d="M26 21v22M26 32l11-11M29.5 29l8 14" fill="none" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
