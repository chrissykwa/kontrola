import { ArrowLeftRight, Scale } from 'lucide-react'
import { dateLabel, shortDayLabel } from '../lib/dates'
import { formatCLP, formatSigned } from '../lib/money'
import { creditCycle, type SpendEntry } from '../lib/stats'
import type { Category, Transaction } from '../lib/types'
import { useStore } from '../state/store'
import { CategoryIcon } from './Icon'

export function TxRow({
  tx,
  category,
  showDate = false,
  showCategory = true,
  entry,
  onSelect,
}: {
  tx: Transaction
  category: Category | undefined
  showDate?: boolean
  /** false cuando ya se está viendo una sola categoría (no repetir su nombre). */
  showCategory?: boolean
  /** Si la fila muestra lo que cuenta en un mes (con tarjeta: una cuota), su monto y cuota. */
  entry?: SpendEntry
  onSelect: (tx: Transaction) => void
}) {
  const { data } = useStore()
  const card = tx.type === 'expense' ? data.settings.accounts.find((a) => a.kind === 'credit' && a.id === tx.accountId) : undefined
  // Con tarjeta: cuándo se paga (o qué cuota es), para que se entienda en qué mes cuenta.
  const cardInfo = entry?.card
    ? entry.unlisted
      ? `${entry.card.name} · sin anotar, vence ${dateLabel(entry.card.dueDate)}`
      : entry.card.installments > 1
      ? `${entry.card.name} · cuota ${entry.card.installment}/${entry.card.installments}`
      : `${entry.card.name} · se paga ${dateLabel(entry.card.dueDate)}`
    : card
      ? (tx.installments ?? 1) > 1
        ? `${card.name} · ${tx.installments} cuotas`
        : `${card.name} · se paga ${dateLabel(creditCycle(tx.date, card).dueDate)}`
      : null
  const isAdjustment = tx.type === 'adjustment'
  const isTransfer = tx.type === 'transfer'
  const title = tx.note || (isAdjustment ? 'Ajuste de saldo' : isTransfer ? 'Traspaso entre cuentas' : category?.name ?? 'Sin categoría')
  const subtitle = [
    isAdjustment ? 'Ajuste' : isTransfer ? 'Traspaso / pago de tarjeta' : tx.note && showCategory ? category?.name : null,
    showDate && !entry?.unlisted ? shortDayLabel(tx.date) : null,
    cardInfo,
  ]
    .filter(Boolean)
    .join(' · ')
  const amount =
    tx.type === 'expense' ? `−${formatCLP(entry?.amount ?? tx.amount)}` : tx.type === 'income' ? `+${formatCLP(tx.amount)}` : isTransfer ? formatCLP(tx.amount) : formatSigned(tx.amount)

  return (
    <li>
      <button type="button" className="tx-row" onClick={() => onSelect(tx)}>
        {isAdjustment || isTransfer ? (
          <span className="cat-icon cat-icon--md cat-icon--neutral" aria-hidden="true">
            {isTransfer ? <ArrowLeftRight strokeWidth={2} /> : <Scale strokeWidth={2} />}
          </span>
        ) : (
          <CategoryIcon category={category} />
        )}
        <span className="tx-row__text">
          <span className="tx-row__title">{title}</span>
          {subtitle && <span className="tx-row__sub">{subtitle}</span>}
        </span>
        <span className={`tx-row__amount ${tx.type === 'income' || (isAdjustment && tx.amount > 0) ? 'is-income' : ''}`}>
          {amount}
        </span>
      </button>
    </li>
  )
}
