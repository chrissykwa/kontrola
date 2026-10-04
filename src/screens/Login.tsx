import { ArrowLeft, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { authErrorMessage, getSupabase } from '../lib/supabase'
import { rememberPasswordForUnlock } from '../lib/vault'
import { useStore } from '../state/store'

type Step =
  | { kind: 'password'; mode: 'signin' | 'signup' }
  | { kind: 'link' }
  | { kind: 'code'; email: string }
  | { kind: 'sent'; email: string; reason: 'confirm' | 'reset' }

/**
 * Entrar con correo y contraseña: todo ocurre dentro de la app, por eso funciona
 * también instalada en la pantalla de inicio del iPhone (ahí un enlace de correo
 * se abriría en Safari y la sesión quedaría allá). El enlace por correo queda como
 * alternativa para el navegador.
 */
export function Login() {
  const { setWithoutAccount } = useStore()
  const [step, setStep] = useState<Step>({ kind: 'password', mode: 'signin' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = (next: Step) => {
    setStep(next)
    setError(null)
  }

  /** Ejecuta una acción de Supabase mostrando "cargando" y errores en español. */
  const run = async (action: (sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>) => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      const sb = await getSupabase()
      if (!sb) throw new Error('not configured')
      await action(sb)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const redirectTo = window.location.origin + window.location.pathname
  const address = email.trim()

  const submitPassword = (e: FormEvent) => {
    e.preventDefault()
    if (step.kind !== 'password' || !address || !password) return
    void run(async (sb) => {
      // Con la misma contraseña se abre (o se crea) la llave que cifra los datos.
      rememberPasswordForUnlock(password)
      if (step.mode === 'signin') {
        const { error: err } = await sb.auth.signInWithPassword({ email: address, password })
        if (err) throw err
        // La sesión nueva la recibe el store y carga tus datos.
        return
      }
      const { data, error: err } = await sb.auth.signUp({ email: address, password, options: { emailRedirectTo: redirectTo } })
      if (err) throw err
      // Supabase devuelve un usuario sin identidades cuando el correo ya tenía cuenta.
      if (data.user && data.user.identities?.length === 0) throw { code: 'user_already_exists' }
      // Si el proyecto pide confirmar el correo, no hay sesión todavía.
      if (!data.session) go({ kind: 'sent', email: address, reason: 'confirm' })
    })
  }

  const forgotPassword = () => {
    if (!address) {
      setError('Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".')
      return
    }
    void run(async (sb) => {
      const { error: err } = await sb.auth.resetPasswordForEmail(address, { redirectTo })
      if (err) throw err
      go({ kind: 'sent', email: address, reason: 'reset' })
    })
  }

  const sendLink = (e?: FormEvent) => {
    e?.preventDefault()
    const target = step.kind === 'code' ? step.email : address
    if (!target) return
    void run(async (sb) => {
      const { error: err } = await sb.auth.signInWithOtp({
        email: target,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      })
      if (err) throw err
      go({ kind: 'code', email: target })
      setCode('')
    })
  }

  const verifyCode = (e: FormEvent) => {
    e.preventDefault()
    if (step.kind !== 'code' || code.length < 6) return
    void run(async (sb) => {
      const { error: err } = await sb.auth.verifyOtp({ email: step.email, token: code, type: 'email' })
      if (err) throw err
    })
  }

  const errorBox = error && (
    <p className="alert alert--over" role="alert">
      <span>{error}</span>
    </p>
  )

  return (
    <main className="onboarding">
      <div className="onboarding__brand">
        <Logo size={72} />
        <h1>Kontrola</h1>
        <p>Entra para tener tus gastos en el celular y el computador.</p>
      </div>

      {step.kind === 'password' && (
        <form className="form card" onSubmit={submitPassword}>
          <div className="field">
            <label htmlFor="login-email" className="field__label">
              Correo
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
            />
          </div>
          <div className="field">
            <label htmlFor="login-password" className="field__label">
              {step.mode === 'signup' ? 'Crea una contraseña' : 'Contraseña'}
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete={step.mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {step.mode === 'signup' && <p className="hint">Mínimo 6 caracteres. Solo la necesitarás una vez por dispositivo.</p>}
          </div>
          {errorBox}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !address || password.length < 6}>
            {busy ? 'Un momento…' : step.mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>
          <div className="login-actions">
            {step.mode === 'signin' ? (
              <>
                <button type="button" className="link-btn" onClick={() => go({ kind: 'password', mode: 'signup' })}>
                  Crear cuenta
                </button>
                <button type="button" className="link-btn" onClick={forgotPassword} disabled={busy}>
                  Olvidé mi contraseña
                </button>
              </>
            ) : (
              <button type="button" className="link-btn" onClick={() => go({ kind: 'password', mode: 'signin' })}>
                <ArrowLeft size={14} aria-hidden="true" /> Ya tengo cuenta
              </button>
            )}
          </div>
        </form>
      )}

      {step.kind === 'link' && (
        <form className="form card" onSubmit={sendLink}>
          <div className="field">
            <label htmlFor="link-email" className="field__label">
              Correo
            </label>
            <input
              id="link-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="hint">
              Te enviaremos un enlace para entrar. Úsalo en el navegador: en la app instalada en el iPhone, el enlace se
              abre en Safari.
            </p>
          </div>
          {errorBox}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !address}>
            {busy ? 'Enviando…' : 'Enviarme el enlace'}
          </button>
          <button type="button" className="link-btn" onClick={() => go({ kind: 'password', mode: 'signin' })}>
            <ArrowLeft size={14} aria-hidden="true" /> Entrar con contraseña
          </button>
        </form>
      )}

      {step.kind === 'code' && (
        <form className="form card" onSubmit={verifyCode}>
          <p className="lead login-sent">
            <Mail size={18} aria-hidden="true" />
            <span>
              Te enviamos un correo a <strong>{step.email}</strong>. Toca el enlace del correo para entrar. Si el correo
              trae un código, también puedes escribirlo aquí.
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
            />
          </div>
          {errorBox}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || code.length < 6}>
            {busy ? 'Entrando…' : 'Entrar con el código'}
          </button>
          <div className="login-actions">
            <button type="button" className="link-btn" onClick={() => go({ kind: 'password', mode: 'signin' })}>
              <ArrowLeft size={14} aria-hidden="true" /> Entrar con contraseña
            </button>
            <button type="button" className="link-btn" onClick={() => void sendLink()} disabled={busy}>
              Reenviar correo
            </button>
          </div>
        </form>
      )}

      {step.kind === 'sent' && (
        <div className="form card">
          <p className="lead login-sent">
            <Mail size={18} aria-hidden="true" />
            <span>
              {step.reason === 'confirm' ? (
                <>
                  Te enviamos un correo a <strong>{step.email}</strong> para confirmar tu cuenta. Tócalo una vez (puede
                  abrirse en Safari, no importa) y después vuelve aquí y entra con tu contraseña.
                </>
              ) : (
                <>
                  Te enviamos un correo a <strong>{step.email}</strong> para crear una contraseña nueva. Ábrelo y ten a
                  mano tu <strong>código de recuperación</strong>: lo necesitas para conservar tus datos cifrados.
                  Después vuelve aquí y entra con la contraseña nueva.
                </>
              )}
            </span>
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => go({ kind: 'password', mode: 'signin' })}>
            Ir a entrar
          </button>
        </div>
      )}

      <div className="login-footer">
        {step.kind === 'password' && (
          <button type="button" className="link-btn" onClick={() => go({ kind: 'link' })}>
            Entrar con un enlace por correo
          </button>
        )}
        <button type="button" className="link-btn" onClick={() => setWithoutAccount(true)}>
          Seguir sin cuenta (solo en este dispositivo)
        </button>
      </div>
    </main>
  )
}
