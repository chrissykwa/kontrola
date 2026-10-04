/**
 * Cifrado de extremo a extremo de los datos de cada usuario.
 *
 * - Cada usuario tiene una llave de datos (AES-GCM de 256 bits) que se crea en su
 *   dispositivo y nunca sale de ahí sin cifrar.
 * - Esa llave se guarda en Supabase "envuelta" (cifrada) dos veces: con una llave
 *   derivada de su contraseña y con otra derivada de su código de recuperación.
 *   Sin la contraseña o el código, nadie puede abrirla (tampoco el dueño del proyecto).
 * - En el dispositivo se guarda como llave no exportable en IndexedDB, para no pedir
 *   la contraseña cada vez que se abre la app.
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

/** Iteraciones de PBKDF2-SHA256 (recomendación OWASP para 2023+). */
export const KDF_ITERATIONS = 600_000

// ---------- base64 ----------

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

// ---------- Código de recuperación ----------

/** Alfabeto sin caracteres que se confunden (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** 24 caracteres en grupos de 4: "K7QX-M2PA-…" (≈118 bits de azar). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(24)
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  return chars.join('').match(/.{4}/g)!.join('-')
}

/** Acepta el código con o sin guiones, espacios o minúsculas. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// ---------- Llaves ----------

async function deriveKek(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Llave de datos envuelta con un secreto (contraseña o código). */
export interface WrappedKey {
  salt: string
  /** base64(iv + llave cifrada) */
  wrapped: string
  iterations: number
}

async function wrapRaw(raw: Uint8Array<ArrayBuffer>, secret: string, iterations = KDF_ITERATIONS): Promise<WrappedKey> {
  const salt = randomBytes(16)
  const kek = await deriveKek(secret, salt, iterations)
  const iv = randomBytes(12)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw))
  const packed = new Uint8Array(iv.length + ct.length)
  packed.set(iv)
  packed.set(ct, iv.length)
  return { salt: toBase64(salt), wrapped: toBase64(packed), iterations }
}

/** Abre una llave envuelta. Falla (lanza `WrongSecretError`) si el secreto no es el correcto. */
async function unwrapRaw(w: WrappedKey, secret: string): Promise<Uint8Array<ArrayBuffer>> {
  const kek = await deriveKek(secret, fromBase64(w.salt), w.iterations)
  const packed = fromBase64(w.wrapped)
  try {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.subarray(0, 12) }, kek, packed.subarray(12))
    return new Uint8Array(raw)
  } catch {
    throw new WrongSecretError()
  }
}

export class WrongSecretError extends Error {
  constructor() {
    super('wrong_secret')
  }
}

const importDataKey = (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])

/** Material de llaves que se guarda en Supabase (tabla `user_keys`). */
export interface KeyBundle {
  password: WrappedKey
  recovery: WrappedKey
}

/** Crea una llave de datos nueva, envuelta con la contraseña y con un código de recuperación nuevo. */
export async function createVault(password: string): Promise<{ key: CryptoKey; bundle: KeyBundle; recoveryCode: string }> {
  const raw = randomBytes(32)
  const recoveryCode = generateRecoveryCode()
  const [pw, rc] = await Promise.all([wrapRaw(raw, password), wrapRaw(raw, normalizeRecoveryCode(recoveryCode))])
  const key = await importDataKey(raw)
  raw.fill(0)
  return { key, bundle: { password: pw, recovery: rc }, recoveryCode }
}

/** Abre la llave de datos con la contraseña. */
export async function unlockWithPassword(bundle: KeyBundle, password: string): Promise<CryptoKey> {
  const raw = await unwrapRaw(bundle.password, password)
  const key = await importDataKey(raw)
  raw.fill(0)
  return key
}

/**
 * Abre la llave con el código de recuperación y la vuelve a envolver con una
 * contraseña nueva (y un código nuevo, porque el anterior ya se usó).
 */
export async function recoverWithCode(
  bundle: KeyBundle,
  code: string,
  newPassword: string,
): Promise<{ key: CryptoKey; bundle: KeyBundle; recoveryCode: string }> {
  const raw = await unwrapRaw(bundle.recovery, normalizeRecoveryCode(code))
  const recoveryCode = generateRecoveryCode()
  const [pw, rc] = await Promise.all([wrapRaw(raw, newPassword), wrapRaw(raw, normalizeRecoveryCode(recoveryCode))])
  const key = await importDataKey(raw)
  raw.fill(0)
  return { key, bundle: { password: pw, recovery: rc }, recoveryCode }
}

/** Genera un código de recuperación nuevo (el anterior deja de servir). Pide la contraseña. */
export async function rotateRecoveryCode(bundle: KeyBundle, password: string): Promise<{ bundle: KeyBundle; recoveryCode: string }> {
  const raw = await unwrapRaw(bundle.password, password)
  const recoveryCode = generateRecoveryCode()
  const recovery = await wrapRaw(raw, normalizeRecoveryCode(recoveryCode))
  raw.fill(0)
  return { bundle: { password: bundle.password, recovery }, recoveryCode }
}

/** Solo comprueba un código de recuperación (sin cambiar nada). */
export async function unlockWithRecoveryCode(bundle: KeyBundle, code: string): Promise<CryptoKey> {
  const raw = await unwrapRaw(bundle.recovery, normalizeRecoveryCode(code))
  const key = await importDataKey(raw)
  raw.fill(0)
  return key
}

// ---------- Cifrar datos ----------

const PREFIX = 'v1:'

/**
 * Cifra un objeto como texto `v1:<base64(iv + datos)>`. `context` (ej. "transactions:<id>")
 * va como dato autenticado: un registro cifrado no se puede mover a otra fila sin que falle.
 */
export async function encryptJSON(key: CryptoKey, value: unknown, context: string): Promise<string> {
  const iv = randomBytes(12)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(context) }, key, enc.encode(JSON.stringify(value))),
  )
  const packed = new Uint8Array(iv.length + ct.length)
  packed.set(iv)
  packed.set(ct, iv.length)
  return PREFIX + toBase64(packed)
}

export async function decryptJSON<T = unknown>(key: CryptoKey, payload: string, context: string): Promise<T> {
  if (!payload.startsWith(PREFIX)) throw new Error('Formato cifrado desconocido')
  const packed = fromBase64(payload.slice(PREFIX.length))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.subarray(0, 12), additionalData: enc.encode(context) },
    key,
    packed.subarray(12),
  )
  return JSON.parse(dec.decode(plain)) as T
}

// ---------- Llave guardada en el dispositivo ----------

const DB_NAME = 'kontrola-llaves'
const STORE = 'llaves'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/** Guarda la llave (no exportable) en este dispositivo. Si IndexedDB no está disponible, no pasa nada. */
export async function cacheKey(userId: string, key: CryptoKey): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put(key, userId))
  } catch {
    // Navegador sin IndexedDB (ej. modo privado antiguo): se pedirá la contraseña al abrir.
  }
}

export async function getCachedKey(userId: string): Promise<CryptoKey | null> {
  try {
    return ((await tx('readonly', (s) => s.get(userId))) as CryptoKey | undefined) ?? null
  } catch {
    return null
  }
}

export async function forgetKeys(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear())
  } catch {
    // nada que borrar
  }
}
