import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { localStore, newId } from '../lib/storage'
import type { AppData, Category, Settings, Transaction } from '../lib/types'

export type TxInput = Omit<Transaction, 'id' | 'createdAt'>

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
  addTransaction(tx: TxInput): void
  updateTransaction(id: string, tx: TxInput): void
  deleteTransaction(id: string): Transaction | undefined
  restoreTransaction(tx: Transaction): void
  updateSettings(patch: Partial<Settings>): void
  upsertCategory(category: Category): void
  replaceAll(data: AppData): void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => localStore.load())

  useEffect(() => {
    localStore.save(data)
  }, [data])

  const store = useMemo<Store>(
    () => ({
      data,
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
    [data],
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
