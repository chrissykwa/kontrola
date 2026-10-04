const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const plain = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

/** 12500 → "$12.500" */
export function formatCLP(value: number): string {
  // Evita "-$0" y normaliza el signo negativo.
  const rounded = Math.round(value)
  if (rounded === 0) return clp.format(0)
  return clp.format(rounded)
}

/** Con signo explícito: +$1.000 / −$1.000 */
export function formatSigned(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 0) return formatCLP(0)
  return (rounded > 0 ? '+' : '−') + formatCLP(Math.abs(rounded))
}

/** Versión compacta para ejes y etiquetas: 1.250.000 → "$1,3M", 45.000 → "$45k" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `${sign}$${m.toLocaleString('es-CL', { maximumFractionDigits: m >= 10 ? 0 : 1 })}M`
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

/** Solo dígitos con separador de miles, para el input: 12500 → "12.500" */
export function formatDigits(value: number): string {
  return plain.format(value)
}

/** Lee lo que escribió el usuario ("12.500", "$ 12500") y devuelve pesos enteros. */
export function parseAmount(input: string): number {
  const digits = input.replace(/[^\d]/g, '')
  if (!digits) return 0
  // Limita a 12 dígitos para evitar valores absurdos.
  return Number(digits.slice(0, 12))
}
