import { formatDigits, parseAmount } from '../lib/money'

/** Campo de monto en pesos con separador de miles mientras se escribe. */
export function AmountInput({
  id,
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  describedBy,
}: {
  id: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  autoFocus?: boolean
  describedBy?: string
}) {
  return (
    <div className="input-money">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? '' : undefined}
        aria-describedby={describedBy}
        value={value ? formatDigits(value) : ''}
        onChange={(e) => {
          const n = parseAmount(e.target.value)
          onChange(n || null)
        }}
      />
    </div>
  )
}
