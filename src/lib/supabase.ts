import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Conexión con Supabase (cuenta + base de datos).
 *
 * Se activa solo si el sitio se compiló con estas variables de entorno
 * (en Vercel: Settings → Environment Variables):
 *   VITE_SUPABASE_URL       → https://<tu-proyecto>.supabase.co
 *   VITE_SUPABASE_ANON_KEY  → la clave "anon"/"publishable" del proyecto
 * La clave anon es pública por diseño: la seguridad la dan las políticas RLS
 * de supabase/schema.sql, que dejan a cada usuario ver solo sus datos.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient> | null = null

/** Cliente de Supabase (se carga solo cuando hace falta). null si no está configurado. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!supabaseConfigured) return null
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // "implicit": el enlace del correo funciona aunque se abra en otro navegador o
        // dispositivo que donde se pidió (con "pkce" solo funciona en el mismo navegador).
        flowType: 'implicit',
        storageKey: 'kontrola:auth',
      },
    }),
  )
  return client
}

/** Traduce los errores de Supabase Auth a mensajes claros. */
export function authErrorMessage(err: unknown): string {
  const e = err as { message?: string; status?: number; code?: string } | null
  const msg = (e?.message ?? '').toLowerCase()
  if (e?.status === 429 || msg.includes('rate limit') || msg.includes('security purposes')) {
    return 'Pediste muchos correos seguidos. Espera un minuto e intenta de nuevo.'
  }
  if (msg.includes('expired') || msg.includes('invalid') || e?.code === 'otp_expired') {
    return 'El código no es válido o ya venció. Pide uno nuevo.'
  }
  if (msg.includes('email') && msg.includes('valid')) return 'Revisa el correo: no parece válido.'
  if (msg.includes('fetch') || msg.includes('network')) return 'Sin conexión. Revisa tu internet e intenta otra vez.'
  return 'No se pudo completar. Intenta de nuevo en un momento.'
}
