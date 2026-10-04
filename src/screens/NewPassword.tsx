import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { useToast } from '../components/Toast'
import { authErrorMessage, getSupabase } from '../lib/supabase'
import { useStore } from '../state/store'

/** Se muestra al abrir el enlace de "Olvidé mi contraseña". */
export function NewPassword() {
  const { account, finishPasswordRecovery } = useStore()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('not configured')
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      finishPasswordRecovery()
      toast({ message: 'Contraseña actualizada. Úsala para entrar en tus otros dispositivos.' })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding">
      <div className="onboarding__brand">
        <Logo size={72} />
        <h1>Nueva contraseña</h1>
        <p>Elige una contraseña nueva para tu cuenta de Kontrola.</p>
      </div>
      <form className="form card" onSubmit={save}>
        {/* Ayuda al llavero del teléfono a guardar la contraseña con el correo correcto */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={account.status === 'signed-in' ? account.email : ''}
          readOnly
          hidden
        />
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
            autoFocus
          />
          <p className="hint">Mínimo 6 caracteres.</p>
        </div>
        {error && (
          <p className="alert alert--over" role="alert">
            <span>{error}</span>
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || password.length < 6}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  )
}
