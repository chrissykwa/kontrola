import { ChartColumn, House, List, Plus, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdjustBalance } from './components/AdjustBalance'
import { Logo } from './components/Logo'
import { Sheet } from './components/Sheet'
import { TransactionForm } from './components/TransactionForm'
import type { Transaction } from './lib/types'
import { Budget } from './screens/Budget'
import { Home } from './screens/Home'
import { Movements } from './screens/Movements'
import { Login } from './screens/Login'
import { NewPassword } from './screens/NewPassword'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import { useStore } from './state/store'
import { UIContext, useHashRoute, type Route, type UIActions } from './state/ui'

type SheetState = { kind: 'new' } | { kind: 'edit'; tx: Transaction } | { kind: 'adjust' } | null

const NAV: { route: Route; label: string; Icon: typeof House }[] = [
  { route: 'inicio', label: 'Inicio', Icon: House },
  { route: 'movimientos', label: 'Movimientos', Icon: List },
  { route: 'presupuesto', label: 'Presupuesto', Icon: Target },
  { route: 'analisis', label: 'Análisis', Icon: ChartColumn },
]

/**
 * Tema propio de la app: claro por defecto, oscuro solo si lo eliges en Ajustes.
 * Usa su propio atributo para no heredar el modo oscuro del sistema ni del visor.
 */
function useTheme() {
  const { data } = useStore()
  const pref = data.settings.theme
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-app-theme', pref)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const paint = () => {
      const dark = pref === 'dark' || (pref === 'system' && media.matches)
      root.style.colorScheme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1416' : '#ffffff')
    }
    paint()
    media.addEventListener('change', paint)
    return () => media.removeEventListener('change', paint)
  }, [pref])
}

export function App() {
  const { data, ready, account, withoutAccount, passwordRecovery } = useStore()
  const [route, navigate] = useHashRoute()
  const [sheet, setSheet] = useState<SheetState>(null)
  useTheme()

  const actions = useMemo<UIActions>(
    () => ({
      navigate,
      openNewTx: () => setSheet({ kind: 'new' }),
      openEditTx: (tx) => setSheet({ kind: 'edit', tx }),
      openAdjust: () => setSheet({ kind: 'adjust' }),
    }),
    [navigate],
  )

  // Atajo: tecla "n" abre un nuevo gasto (en computador).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || sheet) return
      if (target.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      setSheet({ kind: 'new' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  if (!ready) {
    return (
      <div className="splash" role="status">
        <Logo size={56} />
        <span>Cargando tus datos…</span>
      </div>
    )
  }

  if (passwordRecovery) return <NewPassword />

  if (account.status === 'signed-out' && !withoutAccount) return <Login />

  if (!data.settings.onboarded) return <Onboarding />

  const screen = {
    inicio: <Home />,
    movimientos: <Movements />,
    presupuesto: <Budget />,
    analisis: <Stats />,
    ajustes: <Settings />,
  }[route]

  const sheetTitle =
    sheet?.kind === 'new'
      ? 'Nuevo movimiento'
      : sheet?.kind === 'edit'
        ? sheet.tx.type === 'adjustment'
          ? 'Ajuste de saldo'
          : 'Editar movimiento'
        : 'Cuadrar con el banco'

  return (
    <UIContext.Provider value={actions}>
      <div className="app">
        <main className="app__main" id="main">
          {screen}
        </main>

        <nav className="bottom-nav" aria-label="Principal">
          {NAV.slice(0, 2).map(({ route: r, label, Icon }) => (
            <NavItem key={r} active={route === r} label={label} Icon={Icon} onClick={() => navigate(r)} />
          ))}
          <button type="button" className="fab" onClick={actions.openNewTx} aria-label="Registrar gasto o ingreso" title="Registrar (N)">
            <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {NAV.slice(2).map(({ route: r, label, Icon }) => (
            <NavItem key={r} active={route === r} label={label} Icon={Icon} onClick={() => navigate(r)} />
          ))}
        </nav>

        <Sheet open={sheet !== null} title={sheetTitle} onClose={() => setSheet(null)}>
          {sheet?.kind === 'adjust' ? (
            <AdjustBalance onDone={() => setSheet(null)} />
          ) : sheet ? (
            <TransactionForm editing={sheet.kind === 'edit' ? sheet.tx : undefined} onDone={() => setSheet(null)} />
          ) : null}
        </Sheet>
      </div>
    </UIContext.Provider>
  )
}

function NavItem({ active, label, Icon, onClick }: { active: boolean; label: string; Icon: typeof House; onClick: () => void }) {
  return (
    <button type="button" className={`bottom-nav__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
      <span>{label}</span>
    </button>
  )
}
