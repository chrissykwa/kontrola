import { Upload } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useRef, useState, type FormEvent } from 'react'
import { AmountInput } from '../components/AmountInput'
import { useToast } from '../components/Toast'
import { importJSON } from '../lib/storage'
import { useStore } from '../state/store'

export function Onboarding() {
  const { updateSettings, replaceAll } = useStore()
  const toast = useToast()
  const [balance, setBalance] = useState<number | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const start = (e: FormEvent) => {
    e.preventDefault()
    updateSettings({ openingBalance: balance ?? 0, monthlyBudget: budget, onboarded: true })
  }

  return (
    <main className="onboarding">
      <div className="onboarding__brand">
        <Logo size={56} />
        <h1>Kontrola</h1>
        <p>Anota cada gasto en segundos y sabe siempre cuánto te queda.</p>
      </div>

      <form className="form card" onSubmit={start}>
        <div className="field">
          <label htmlFor="ob-balance" className="field__label">
            ¿Cuánto tienes hoy en tu cuenta?
          </label>
          <AmountInput id="ob-balance" value={balance} onChange={setBalance} autoFocus describedBy="ob-balance-help" />
          <p id="ob-balance-help" className="hint">
            Míralo en la app de tu banco. Desde aquí, Kontrola irá descontando lo que gastes.
          </p>
        </div>
        <div className="field">
          <label htmlFor="ob-budget" className="field__label">
            ¿Cuánto quieres gastar al mes? <span className="field__optional">(opcional)</span>
          </label>
          <AmountInput id="ob-budget" value={budget} onChange={setBudget} describedBy="ob-budget-help" />
          <p id="ob-budget-help" className="hint">
            Con esto te diremos cuánto puedes gastar por día. Después lo puedes separar por categoría.
          </p>
        </div>
        <button type="submit" className="btn btn--primary btn--block">
          Empezar
        </button>
      </form>

      <button type="button" className="link-btn onboarding__import" onClick={() => fileInput.current?.click()}>
        <Upload size={16} aria-hidden="true" /> Ya tengo un respaldo de Kontrola
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            const next = importJSON(await f.text())
            replaceAll(next)
            toast({ message: `Respaldo importado: ${next.transactions.length} movimientos` })
          } catch (err) {
            toast({ message: err instanceof Error ? err.message : 'No se pudo importar el archivo' })
          }
        }}
      />
    </main>
  )
}
