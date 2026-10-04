import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { connectClaudeCloud, type Cloud } from '../lib/cloud'
import { createInitialData } from '../lib/defaults'
import { localStore, newId } from '../lib/storage'
import { getSupabase, supabaseConfigured } from '../lib/supabase'
import { supabaseCloud } from '../lib/supabaseCloud'
import type { AppData, Category, Settings, Transaction } from '../lib/types'

export type TxInput = Omit<Transaction, 'id' | 'createdAt'>

/** Dónde quedan guardados los datos. */
export type SyncMode = 'connecting' | 'cloud' | 'local'

/** Cuenta de Supabase. `none`: esta versión no usa cuentas (claude.ai o sitio sin Supabase). */
export type Account =
  | { status: 'none' }
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string }

type Action =
  | { type: 'addTx'; tx: TxInput }
  | { type: 'updateTx'; id: string; tx: TxInput }
  | { type: 'deleteTx'; id: string }
  | { type: 'restoreTx'; tx: Transaction }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'upsertCategory'; category: Category }
  | { type: 'replaceAll'; data: AppData }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'addTx':
      return {
        ...state,
        transactions: [...state.transactions, { ...action.tx, id: newId(), createdAt: Date.now() }],
      }
    case 'updateTx':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.id ? { ...t, ...action.tx } : t)),
      }
    case 'deleteTx':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) }
    case 'restoreTx':
      return { ...state, transactions: [...state.transactions, action.tx] }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'upsertCategory': {
      const exists = state.categories.some((c) => c.id === action.category.id)
      return {
        ...state,
        categories: exists
          ? state.categories.map((c) => (c.id === action.category.id ? action.category : c))
          : [...state.categories, action.category],
      }
    }
    case 'replaceAll':
      return action.data
  }
}

interface Store {
  data: AppData
  /** false mientras se traen los datos de la cuenta y no hay copia local que mostrar. */
  ready: boolean
  sync: SyncMode
  account: Account
  /** El usuario eligió usar la app sin cuenta en este dispositivo. */
  withoutAccount: boolean
  setWithoutAccount(value: boolean): void
  /** Se abrió el enlace de "Olvidé mi contraseña": hay que pedir una contraseña nueva. */
  passwordRecovery: boolean
  finishPasswordRecovery(): void
  signOut(): Promise<void>
  addTransaction(tx: TxInput): void
  updateTransaction(id: string, tx: TxInput): void
  deleteTransaction(id: string): Transaction | undefined
  restoreTransaction(tx: Transaction): void
  updateSettings(patch: Partial<Settings>): void
  upsertCategory(category: Category): void
  replaceAll(data: AppData): void
}

const StoreContext = createContext<Store | null>(null)

/** Estado vacío para subir todo la primera vez que se conecta la cuenta. */
const NOTHING: AppData = {
  version: 1,
  settings: {} as Settings,
  categories: [],
  transactions: [],
}

/** Hay cambios hechos en este dispositivo que todavía no llegan a la nube (ej: sin internet). */
const UNSYNCED_KEY = 'kontrola:sin-sincronizar'
const NO_ACCOUNT_KEY = 'kontrola:sin-cuenta'

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
const writeFlag = (key: string, on: boolean) => {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // almacenamiento bloqueado: no es crítico
  }
}

const insideClaude = () => typeof (window as { claude?: { use?: unknown } }).claude?.use === 'function'
const usesAccounts = () => !insideClaude() && supabaseConfigured

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => localStore.load())
  const [sync, setSync] = useState<SyncMode>(() => (insideClaude() || supabaseConfigured ? 'connecting' : 'local'))
  const [account, setAccount] = useState<Account>(() => (usesAccounts() ? { status: 'checking' } : { status: 'none' }))
  const [withoutAccount, setWithoutAccountState] = useState(() => readFlag(NO_ACCOUNT_KEY))
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const cloud = useRef<Cloud | null>(null)
  /** Último estado que coincide con lo guardado en la nube. */
  const synced = useRef<AppData | null>(null)
  /** Cómo reconectar si la primera carga falló (ej: se abrió sin internet). */
  const connector = useRef<(() => Promise<Cloud | null>) | null>(null)
  const attachedUser = useRef<string | null>(null)
  const latest = useRef(data)
  latest.current = data
  const lastLocal = useRef(data)

  const onIdle = useCallback(() => writeFlag(UNSYNCED_KEY, false), [])

  /** Conecta con la nube y decide qué datos mandan: los de la nube o cambios pendientes de este dispositivo. */
  const attach = useCallback(async (connect: () => Promise<Cloud | null>) => {
    connector.current = connect
    setSync('connecting')
    try {
      const c = await connect()
      if (!c) {
        setSync('local')
        return
      }
      const remote = await c.load()
      const local = latest.current
      cloud.current = c
      if (readFlag(UNSYNCED_KEY) && local.settings.onboarded) {
        // Lo de este dispositivo es más nuevo: se sube encima de lo que hay en la nube.
        synced.current = remote ?? NOTHING
      } else if (remote) {
        synced.current = remote
        dispatch({ type: 'replaceAll', data: remote })
      } else {
        // Primera vez con la cuenta: se sube lo que haya en este dispositivo.
        synced.current = NOTHING
      }
      setSync('cloud')
    } catch {
      setSync('local')
    }
  }, [])

  // Elegir la nube: la cuenta de claude.ai, una cuenta de Supabase o ninguna.
  useEffect(() => {
    if (insideClaude()) {
      void attach(() => connectClaudeCloud(onIdle))
      return
    }
    const sbPromise = getSupabase()
    if (!sbPromise) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void sbPromise.then((sb) => {
      if (cancelled) return
      const handle = (user: { id: string; email?: string } | null) => {
        if (!user) {
          if (attachedUser.current) {
            // Cerró sesión: se borra la copia local para que nadie más vea sus datos aquí.
            attachedUser.current = null
            cloud.current = null
            connector.current = null
            synced.current = null
            writeFlag(UNSYNCED_KEY, false)
            const empty = createInitialData()
            localStore.save(empty)
            dispatch({ type: 'replaceAll', data: empty })
          }
          setAccount({ status: 'signed-out' })
          setSync('local')
          return
        }
        setAccount({ status: 'signed-in', email: user.email ?? '' })
        if (attachedUser.current === user.id) return
        attachedUser.current = user.id
        void attach(async () => supabaseCloud(sb, user.id, onIdle))
      }
      const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        // Supabase recomienda no llamar a la base dentro de este callback: se difiere.
        window.setTimeout(() => handle(session?.user ?? null), 0)
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [attach, onIdle])

  // Guardar cada cambio: siempre en el dispositivo y, si hay cuenta, en la nube.
  useEffect(() => {
    if (data !== lastLocal.current) {
      lastLocal.current = data
      localStore.save(data)
    }
    const c = cloud.current
    if (!c) {
      // Con cuenta pero sin conexión: se marca para subirlo apenas se pueda.
      if (connector.current && synced.current !== data && data.settings.onboarded) writeFlag(UNSYNCED_KEY, true)
      return
    }
    if (!synced.current || synced.current === data) return
    // No sube el estado vacío previo a la bienvenida (sí sube un "Borrar todo").
    if (synced.current === NOTHING && !data.settings.onboarded) return
    writeFlag(UNSYNCED_KEY, true)
    c.save(synced.current, data)
    synced.current = data
  }, [data, sync])

  // Al volver a la app: reintenta la conexión o trae lo que se hizo en otro dispositivo.
  useEffect(() => {
    const refresh = async () => {
      const c = cloud.current
      if (document.visibilityState === 'hidden') {
        void c?.flush()
        return
      }
      if (!c) {
        if (connector.current) void attach(connector.current)
        return
      }
      if (c.hasPendingWrites()) return
      try {
        const remote = await c.load()
        if (!remote || c.hasPendingWrites()) return
        if (JSON.stringify(remote) === JSON.stringify(synced.current)) return
        synced.current = remote
        dispatch({ type: 'replaceAll', data: remote })
      } catch {
        // sin conexión: se sigue con lo que hay
      }
    }
    const onOnline = () => {
      if (!cloud.current && connector.current) void attach(connector.current)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', onOnline)
    }
  }, [attach])

  const setWithoutAccount = useCallback((value: boolean) => {
    writeFlag(NO_ACCOUNT_KEY, value)
    setWithoutAccountState(value)
  }, [])

  const signOut = useCallback(async () => {
    await cloud.current?.flush()
    const sb = await getSupabase()
    await sb?.auth.signOut()
  }, [])

  const ready = account.status !== 'checking' && (sync !== 'connecting' || data.settings.onboarded)

  const store = useMemo<Store>(
    () => ({
      data,
      ready,
      sync,
      account,
      withoutAccount,
      setWithoutAccount,
      passwordRecovery,
      finishPasswordRecovery: () => setPasswordRecovery(false),
      signOut,
      addTransaction: (tx) => dispatch({ type: 'addTx', tx }),
      updateTransaction: (id, tx) => dispatch({ type: 'updateTx', id, tx }),
      deleteTransaction: (id) => {
        const tx = data.transactions.find((t) => t.id === id)
        dispatch({ type: 'deleteTx', id })
        return tx
      },
      restoreTransaction: (tx) => dispatch({ type: 'restoreTx', tx }),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      upsertCategory: (category) => dispatch({ type: 'upsertCategory', category }),
      replaceAll: (next) => dispatch({ type: 'replaceAll', data: next }),
    }),
    [data, ready, sync, account, withoutAccount, setWithoutAccount, signOut, passwordRecovery],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return ctx
}

export function useCategoryMap(): Map<string, Category> {
  const { data } = useStore()
  return useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories])
}
