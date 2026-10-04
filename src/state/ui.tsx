import { createContext, useContext, useEffect, useState } from 'react'
import type { MonthKey } from '../lib/dates'
import type { Transaction } from '../lib/types'

export type Route = 'inicio' | 'movimientos' | 'presupuesto' | 'analisis' | 'ajustes'

const ROUTES: Route[] = ['inicio', 'movimientos', 'presupuesto', 'analisis', 'ajustes']

function readHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(h) ? h : 'inicio'
}

/** Navegación por hash (#/movimientos): funciona en cualquier hosting estático y respeta el botón atrás. */
export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(readHash)
  useEffect(() => {
    const onChange = () => {
      setRoute(readHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = (r: Route) => {
    if (r === route) return
    // El estado manda; el hash es un extra (en algunos visores embebidos no se puede cambiar).
    setRoute(r)
    window.scrollTo({ top: 0 })
    try {
      window.location.hash = `/${r}`
    } catch {
      // sin hash: la navegación igual funciona
    }
  }
  return [route, navigate]
}

export interface UIActions {
  navigate(r: Route): void
  openNewTx(): void
  openEditTx(tx: Transaction): void
  openAdjust(): void
  /** Desglose de una categoría en un mes (`categoryId` como en `monthSummary().byCategory`). */
  openCategory(categoryId: string, month: MonthKey): void
}

export const UIContext = createContext<UIActions | null>(null)

export function useUI(): UIActions {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIContext.Provider>')
  return ctx
}
