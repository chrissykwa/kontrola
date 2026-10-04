import { Check, Copy, Download, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Logo } from '../components/Logo'
import { WrongSecretError } from '../lib/crypto'
import { authErrorMessage } from '../lib/supabase'
import { useStore } from '../state/store'

/** Mensaje de error para las acciones de la bóveda. */
function vaultError(err: unknown, kind: 'password' | 'code'): string {
  if (err instanceof WrongSecretError) {
    return kind === 'password'
      ? 'Esa no es la contraseña con la que se protegieron tus datos.'
      : 'El código de recuperación no es correcto. Revisa que esté completo.'
  }
  return authErrorMessage(err)
}

function Brand({ title, text, icon }: { title: string; text: string; icon?: ReactNode }) {
  return (
    <div className="onboarding__brand">
      {icon ?? <Logo size={72} />}
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  )
}

/** Se muestra una sola vez, al crear la llave o al generar un código nuevo. */
export function RecoveryCodeScreen() {
  const { recoveryCode, acknowledgeRecoveryCode, account } = useStore()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!recoveryCode) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin acceso al portapapeles: el código igual se puede seleccionar a mano.
    }
  }

  const download = () => {
    const email = account.status === 'signed-in' ? account.email : ''
    const text = `Kontrola — código de recuperación\n\nCuenta: ${email}\nCódigo: ${recoveryCode}\n\nSirve para recuperar tus datos si olvidas tu contraseña. Guárdalo en un lugar seguro y no lo compartas.\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kontrola-codigo-de-recuperacion.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="onboarding">
      <Brand
        icon={<span className="vault-icon" aria-hidden="true"><KeyRound size={30} /></span>}
        title="Tu código de recuperación"
        text="Tus datos quedan cifrados: nadie más puede leerlos. Si algún día olvidas tu contraseña, este código es la única forma de recuperarlos."
      />
      <div className="form card">
        <p className="recovery-code" aria-label="Código de recuperación">
          {recoveryCode}
        </p>
        <div className="recovery-actions">
          <button type="button" className="btn btn--ghost" onClick={() => void copy()}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={download}>
            <Download size={18} aria-hidden="true" /> Descargar
          </button>
        </div>
        <p className="hint">
          Guárdalo fuera de esta app: en tus notas, en tu gestor de contraseñas o anotado en papel. No se vuelve a mostrar.
        </p>
        <label className="check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Ya lo guardé en un lugar seguro
        </label>
        <button type="button" className="btn btn--primary btn--block" disabled={!saved} onClick={acknowledgeRecoveryCode}>
          Continuar
        </button>
      </div>
    </main>
  )
}

/** Dispositivo nuevo (o entrada con enlace): abrir la llave con la contraseña o el código. */
export function UnlockScreen() {
  const { unlockVault, signOut, account } = useStore()
  const [kind, setKind] = useState<'password' | 'code'>('password')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await unlockVault(secret, kind)
    } catch (err) {
      setError(vaultError(err, kind))
      setBusy(false)
    }
  }

  return (
    <main className="onboarding">
      <Brand
        icon={<span className="vault-icon" aria-hidden="true"><LockKeyhole size={30} /></span>}
        title="Abre tus datos"
        text="Tus datos están cifrados. Escribe tu contraseña para verlos en este dispositivo (solo esta vez)."
      />
      <form className="form card" onSubmit={submit}>
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={account.status === 'signed-in' ? account.email : ''}
          readOnly
          hidden
        />
        <div className="field">
          <label htmlFor="unlock-secret" className="field__label">
            {kind === 'password' ? 'Contraseña' : 'Código de recuperación'}
          </label>
          <input
            id="unlock-secret"
            className={`input ${kind === 'code' ? 'input--code-text' : ''}`}
            type={kind === 'password' ? 'password' : 'text'}
            autoComplete={kind === 'password' ? 'current-password' : 'off'}
            autoCapitalize={kind === 'code' ? 'characters' : undefined}
            placeholder={kind === 'code' ? 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX' : undefined}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && (
          <p className="alert alert--over" role="alert">
            <span>{error}</span>
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !secret}>
          {busy ? 'Abriendo…' : 'Abrir mis datos'}
        </button>
        <div className="login-actions">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setKind(kind === 'password' ? 'code' : 'password')
              setSecret('')
              setError(null)
            }}
          >
            {kind === 'password' ? 'Usar código de recuperación' : 'Usar contraseña'}
          </button>
          <button type="button" className="link-btn" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </form>
    </main>
  )
}

/** Cuenta sin llave todavía: elegir contraseña y crear la llave. Los datos existentes se cifran. */
export function SetupVaultScreen() {
  const { setupVault, signOut, account, data } = useStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mismatch = confirm.length > 0 && password !== confirm

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    setBusy(true)
    setError(null)
    try {
      await setupVault(password)
    } catch (err) {
      setError(vaultError(err, 'password'))
      setBusy(false)
    }
  }

  return (
    <main className="onboarding">
      <Brand
        icon={<span className="vault-icon" aria-hidden="true"><ShieldCheck size={30} /></span>}
        title="Protege tus datos"
        text={
          data.settings.onboarded
            ? 'Kontrola ahora cifra tus datos en tu teléfono antes de guardarlos: nadie más podrá leerlos, ni siquiera quien administra la app. Confirma tu contraseña para activarlo.'
            : 'Kontrola cifra tus datos en tu teléfono antes de guardarlos: nadie más podrá leerlos, ni siquiera quien administra la app. Elige tu contraseña para activarlo.'
        }
      />
      <form className="form card" onSubmit={submit}>
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={account.status === 'signed-in' ? account.email : ''}
          readOnly
          hidden
        />
        <div className="field">
          <label htmlFor="setup-password" className="field__label">
            Tu contraseña de Kontrola
          </label>
          <input
            id="setup-password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <p className="hint">Puede ser la misma con la que entras. Si escribes otra, pasa a ser tu contraseña nueva.</p>
        </div>
        <div className="field">
          <label htmlFor="setup-confirm" className="field__label">
            Repítela
          </label>
          <input
            id="setup-confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {mismatch && <p className="hint hint--error">Las contraseñas no coinciden.</p>}
        </div>
        {error && (
          <p className="alert alert--over" role="alert">
            <span>{error}</span>
          </p>
        )}
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={busy || password.length < 6 || password !== confirm}
        >
          {busy ? 'Protegiendo…' : 'Activar cifrado'}
        </button>
        <button type="button" className="link-btn" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </form>
    </main>
  )
}
