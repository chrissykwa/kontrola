import { ArrowLeft, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { authErrorMessage, getSupabase } from '../lib/supabase'
import { useStore } from '../state/store'

type Step = { kind: 'email' } | { kind: 'code'; email: string }

/**
 * Entrar con el correo: Supabase envía un enlace (y un código de 6 dígitos si la
 * plantilla lo incluye, lo que requiere SMTP propio). El código sirve en la app
 * instalada en el iPhone, donde el enlace se abriría en Safari y no en la app.
 */
export function Login() {
  const { setWithoutAccount } = useStore()
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault()
    const address = (step.kind === 'code' ? step.email : email).trim()
    if (!address) return
    setBusy(true)
    setError(null)
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('not configured')
      const { error: err } = await sb.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (err) throw err
      setStep({ kind: 'code', email: address })
      setCode('')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (step.kind !== 'code' || code.length < 6) return
    setBusy(true)
    setError(null)
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('not configured')
      const { error: err } = await sb.auth.verifyOtp({ email: step.email, token: code, type: 'email' })
      if (err) throw err
      // La sesión nueva la recibe el store y carga tus datos.
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <main className="onboarding">
      <div className="onboarding__brand">
        <Logo size={72} />
        <h1>Kontrola</h1>
        <p>Entra con tu correo para tener tus gastos en el celular y el computador.</p>
      </div>

      {step.kind === 'email' ? (
        <form className="form card" onSubmit={sendCode}>
          <div className="field">
            <label htmlFor="login-email" className="field__label">
              Tu correo
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <p className="hint">Te enviaremos un enlace para entrar. No necesitas contraseña.</p>
          </div>
          {error && (
            <p className="alert alert--over" role="alert">
              <span>{error}</span>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !email.trim()}>
            {busy ? 'Enviando…' : 'Enviarme el enlace'}
          </button>
        </form>
      ) : (
        <form className="form card" onSubmit={verify}>
          <p className="lead login-sent">
            <Mail size={18} aria-hidden="true" />
            <span>
              Te enviamos un correo a <strong>{step.email}</strong>. Toca el enlace del correo para entrar. Si el
              correo trae un código, también puedes escribirlo aquí.
            </span>
          </p>
          <div className="field">
            <label htmlFor="login-code" className="field__label">
              Código
            </label>
            <input
              id="login-code"
              className="input input--code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
          {error && (
            <p className="alert alert--over" role="alert">
              <span>{error}</span>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || code.length < 6}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <div className="login-actions">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setStep({ kind: 'email' })
                setError(null)
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" /> Usar otro correo
            </button>
            <button type="button" className="link-btn" onClick={() => void sendCode()} disabled={busy}>
              Reenviar código
            </button>
          </div>
        </form>
      )}

      <button type="button" className="link-btn onboarding__import" onClick={() => setWithoutAccount(true)}>
        Seguir sin cuenta (solo en este dispositivo)
      </button>
    </main>
  )
}
