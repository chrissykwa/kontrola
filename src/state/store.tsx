import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { connectCloud, type Cloud } from '../lib/cloud'
import { localStore, newId } from '../lib/storage'
import type { AppData, Category, Settings, Transaction } from '../lib/types'

export type TxInput = Omit<Transaction, 'id' | 'createdAt'>

/** Dónde quedan guardados los datos. */
export type SyncMode = 'connecting' | 'cloud' | 'local'

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

const insideClaude = () => typeof (window as { claude?: { use?: unknown } }).claude?.use === 'function'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => localStore.load())
  const [sync, setSync] = useState<SyncMode>(() => (insideClaude() ? 'connecting' : 'local'))
  const cloud = useRef<Cloud | null>(null)
  /** Último estado que coincide con lo guardado en la nube. */
  const synced = useRef<AppData | null>(null)

  // Conectar con la cuenta y traer los datos guardados.
  useEffect(() => {
    let cancelled = false
    connectCloud().then(async (c) => {
      if (cancelled) return
      if (!c) {
        setSync('local')
        return
      }
      try {
        const remote = await c.load()
        if (cancelled) return
        cloud.current = c
        if (remote) {
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
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Guardar cada cambio: siempre en el dispositivo y, si hay cuenta, en la nube.
  useEffect(() => {
    localStore.save(data)
    const c = cloud.current
    if (!c || !synced.current || synced.current === data) return
    // No sube el estado vacío previo a la bienvenida (sí sube un "Borrar todo").
    if (synced.current === NOTHING && !data.settings.onboarded) return
    c.save(synced.current, data)
    synced.current = data
  }, [data, sync])

  // Al volver a la app (ej: la usaste en otro dispositivo), refresca desde la nube.
  useEffect(() => {
    const onVisible = async () => {
      const c = cloud.current
      if (document.visibilityState === 'hidden') {
        void c?.flush()
        return
      }
      if (!c || c.hasPendingWrites()) return
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
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const ready = sync !== 'connecting' || data.settings.onboarded

  const store = useMemo<Store>(
    () => ({
      data,
      ready,
      sync,
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
    [data, ready, sync],
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
