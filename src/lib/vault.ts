import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeyBundle } from './crypto'

/**
 * La "bóveda" de cada usuario: su llave de datos envuelta, guardada en la tabla
 * `user_keys`. Lo que se guarda no sirve sin la contraseña o el código de recuperación.
 */

interface UserKeysRow {
  user_id: string
  password_salt: string
  password_wrapped: string
  password_iterations: number
  recovery_salt: string
  recovery_wrapped: string
  recovery_iterations: number
}

export async function loadBundle(sb: SupabaseClient, userId: string): Promise<KeyBundle | null> {
  const { data, error } = await sb.from('user_keys').select('*').eq('user_id', userId).limit(1)
  if (error) throw error
  const r = (data as UserKeysRow[] | null)?.[0]
  if (!r) return null
  return {
    password: { salt: r.password_salt, wrapped: r.password_wrapped, iterations: r.password_iterations },
    recovery: { salt: r.recovery_salt, wrapped: r.recovery_wrapped, iterations: r.recovery_iterations },
  }
}

export async function saveBundle(sb: SupabaseClient, userId: string, b: KeyBundle): Promise<void> {
  const row: UserKeysRow = {
    user_id: userId,
    password_salt: b.password.salt,
    password_wrapped: b.password.wrapped,
    password_iterations: b.password.iterations,
    recovery_salt: b.recovery.salt,
    recovery_wrapped: b.recovery.wrapped,
    recovery_iterations: b.recovery.iterations,
  }
  const { error } = await sb.from('user_keys').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

/** Borra los datos y la llave del usuario (cuando perdió contraseña y código y quiere empezar de cero). */
export async function wipeUserData(sb: SupabaseClient, userId: string): Promise<void> {
  for (const table of ['transactions', 'categories', 'settings', 'user_keys']) {
    const { error } = await sb.from(table).delete().eq('user_id', userId)
    if (error) throw error
  }
}

/**
 * La contraseña recién escrita en la pantalla de entrada se guarda un instante en
 * memoria para abrir (o crear) la llave sin pedirla de nuevo. Nunca se guarda en disco.
 */
let pendingPassword: string | null = null

export function rememberPasswordForUnlock(password: string) {
  pendingPassword = password
}

export function takePendingPassword(): string | null {
  const p = pendingPassword
  pendingPassword = null
  return p
}
