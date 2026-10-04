import { Scale } from 'lucide-react'
import { shortDayLabel } from '../lib/dates'
import { formatCLP, formatSigned } from '../lib/money'
import type { Category, Transaction } from '../lib/types'
import { CategoryIcon } from './Icon'

export function TxRow({
  tx,
  category,
  showDate = false,
  onSelect,
}: {
  tx: Transaction
  category: Category | undefined
  showDate?: boolean
  onSelect: (tx: Transaction) => void
}) {
  const isAdjustment = tx.type === 'adjustment'
  const title = tx.note || (isAdjustment ? 'Ajuste de saldo' : category?.name ?? 'Sin categoría')
  const subtitle = [isAdjustment ? 'Ajuste' : tx.note ? category?.name : null, showDate ? shortDayLabel(tx.date) : null]
    .filter(Boolean)
    .join(' · ')
  const amount =
    tx.type === 'expense' ? `−${formatCLP(tx.amount)}` : tx.type === 'income' ? `+${formatCLP(tx.amount)}` : formatSigned(tx.amount)

  return (
    <li>
      <button type="button" className="tx-row" onClick={() => onSelect(tx)}>
        {isAdjustment ? (
          <span className="cat-icon cat-icon--md cat-icon--neutral" aria-hidden="true">
            <Scale strokeWidth={2} />
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
