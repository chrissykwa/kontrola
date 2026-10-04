import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { WrongSecretError } from '../lib/crypto'
import { authErrorMessage } from '../lib/supabase'
import { useStore } from '../state/store'

/**
 * Se muestra al abrir el enlace de "Olvidé mi contraseña".
 * Como los datos están cifrados con la contraseña anterior, para conservarlos hace
 * falta el código de recuperación. Sin él, solo queda empezar de cero.
 */
export function NewPassword() {
  const { account, vaultExists, recoverAccount, startOver } = useStore()
  const [hasVault, setHasVault] = useState<boolean | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'recover' | 'start-over'>('recover')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La sesión de recuperación tarda un instante en quedar lista: se reintenta.
  useEffect(() => {
    let cancelled = false
    const check = async (attempt: number) => {
      try {
        const exists = await vaultExists()
        if (!cancelled) setHasVault(exists)
      } catch {
        if (!cancelled && attempt < 20) window.setTimeout(() => void check(attempt + 1), 300)
        else if (!cancelled) setHasVault(false)
      }
    }
    void check(0)
    return () => {
      cancelled = true
    }
  }, [vaultExists])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'start-over') await startOver(password)
      else await recoverAccount(code, password)
    } catch (err) {
      setError(
        err instanceof WrongSecretError
          ? 'El código de recuperación no es correcto. Revisa que esté completo.'
          : authErrorMessage(err),
      )
      setBusy(false)
    }
  }

  const needsCode = hasVault === true && mode === 'recover'
  const canSubmit =
    !busy &&
    hasVault !== null &&
    password.length >= 6 &&
    (!needsCode || code.trim().length >= 24) &&
    (mode === 'recover' || confirmText.trim().toLowerCase() === 'borrar')

  return (
    <main className="onboarding">
      <div className="onboarding__brand">
        <Logo size={72} />
        <h1>Nueva contraseña</h1>
        <p>
          {needsCode
            ? 'Tus datos están cifrados. Para conservarlos, escribe tu código de recuperación y elige una contraseña nueva.'
            : 'Elige una contraseña nueva para tu cuenta de Kontrola.'}
        </p>
      </div>
      <form className="form card" onSubmit={submit}>
        {/* Ayuda al llavero del teléfono a guardar la contraseña con el correo correcto */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={account.status === 'signed-in' ? account.email : ''}
          readOnly
          hidden
        />
        {needsCode && (
          <div className="field">
            <label htmlFor="recovery-code" className="field__label">
              Código de recuperación
            </label>
            <input
              id="recovery-code"
              className="input input--code-text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
        )}
        {mode === 'start-over' && (
          <div className="alert alert--over">
            <span>
              Sin el código no hay forma de abrir tus datos cifrados. Si sigues, <strong>se borran todos</strong> (gastos,
              categorías y presupuesto) y empiezas de cero con la contraseña nueva. No se puede deshacer.
            </span>
          </div>
        )}
        <div className="field">
          <label htmlFor="new-password" className="field__label">
            Contraseña nueva
          </label>
          <input
            id="new-password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={!needsCode}
          />
          <p className="hint">Mínimo 6 caracteres.</p>
        </div>
        {mode === 'start-over' && (
          <div className="field">
            <label htmlFor="start-over-confirm" className="field__label">
              Escribe <strong>borrar</strong> para confirmar
            </label>
            <input
              id="start-over-confirm"
              className="input"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        )}
        {error && (
          <p className="alert alert--over" role="alert">
            <span>{error}</span>
          </p>
        )}
        <button
          type="submit"
          className={`btn btn--block ${mode === 'start-over' ? 'btn--danger' : 'btn--primary'}`}
          disabled={!canSubmit}
        >
          {busy ? 'Guardando…' : mode === 'start-over' ? 'Borrar datos y empezar de cero' : 'Guardar contraseña'}
        </button>
        {hasVault && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'recover' ? 'start-over' : 'recover')
              setError(null)
            }}
          >
            {mode === 'recover' ? 'No tengo el código' : 'Tengo el código'}
          </button>
        )}
      </form>
    </main>
  )
}
