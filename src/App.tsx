import { ChartColumn, CreditCard, FileUp, House, List, Plus, Settings as SettingsIcon, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdjustBalance } from './components/AdjustBalance'
import { CategoryDetail } from './components/CategoryDetail'
import { LaunchSplash } from './components/LaunchSplash'
import { Logo } from './components/Logo'
import { Sheet } from './components/Sheet'
import { TransactionForm } from './components/TransactionForm'
import type { MonthKey } from './lib/dates'
import type { Transaction } from './lib/types'
import { Budget } from './screens/Budget'
import { Home } from './screens/Home'
import { Movements } from './screens/Movements'
import { Login } from './screens/Login'
import { NewPassword } from './screens/NewPassword'
import { RecoveryCodeScreen, SetupVaultScreen, UnlockScreen } from './screens/Vault'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import { Accounts } from './screens/Accounts'
import { ImportMovements } from './screens/ImportMovements'
import { useCategoryMap, useStore } from './state/store'
import { UIContext, useHashRoute, type Route, type UIActions } from './state/ui'

type CategoryRef = { categoryId: string; month: MonthKey }

type SheetState =
  | { kind: 'new' }
  // `back`: si se abrió desde el desglose de una categoría, al terminar se vuelve a él.
  | { kind: 'edit'; tx: Transaction; back?: CategoryRef }
  | { kind: 'adjust' }
  | ({ kind: 'category' } & CategoryRef)
  | null

const NAV: { route: Route; label: string; Icon: typeof House }[] = [
  { route: 'inicio', label: 'Inicio', Icon: House },
  { route: 'movimientos', label: 'Movimientos', Icon: List },
  { route: 'presupuesto', label: 'Presupuesto', Icon: Target },
  { route: 'analisis', label: 'Análisis', Icon: ChartColumn },
]

/** Barra inferior del celular: tres a cada lado del botón +, con nombres cortos para que quepan. */
const MOBILE_NAV: { route: Route; label: string; short?: string; Icon: typeof House }[][] = [
  [NAV[0], { ...NAV[1], short: 'Movim.' }, { route: 'cuentas', label: 'Cuentas', Icon: CreditCard }],
  [{ ...NAV[2], short: 'Presup.' }, NAV[3], { route: 'importar', label: 'Importar', Icon: FileUp }],
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
  return (
    <>
      <AppScreens />
      <LaunchSplash />
    </>
  )
}

function AppScreens() {
  const { data, ready, account, withoutAccount, passwordRecovery, vault, recoveryCode } = useStore()
  const [route, navigate] = useHashRoute()
  const [sheet, setSheet] = useState<SheetState>(null)
  const cats = useCategoryMap()
  useTheme()

  const actions = useMemo<UIActions>(
    () => ({
      navigate,
      openNewTx: () => setSheet({ kind: 'new' }),
      openEditTx: (tx) => setSheet({ kind: 'edit', tx }),
      openAdjust: () => setSheet({ kind: 'adjust' }),
      openCategory: (categoryId, month) => setSheet({ kind: 'category', categoryId, month }),
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

  // Mientras tanto se ve la pantalla de apertura (LaunchSplash).
  if (!ready) return null

  if (passwordRecovery) return <NewPassword />

  if (account.status === 'signed-out' && !withoutAccount) return <Login />

  if (account.status === 'signed-in') {
    if (recoveryCode) return <RecoveryCodeScreen />
    if (vault === 'locked') return <UnlockScreen />
    if (vault === 'setup') return <SetupVaultScreen />
  }

  if (!data.settings.onboarded) return <Onboarding />

  const screen = {
    inicio: <Home />,
    movimientos: <Movements />,
    presupuesto: <Budget />,
    analisis: <Stats />,
    ajustes: <Settings />,
    cuentas: <Accounts />,
    importar: <ImportMovements />,
  }[route]

  const sheetTitle =
    sheet?.kind === 'new'
      ? 'Nuevo movimiento'
      : sheet?.kind === 'edit'
        ? sheet.tx.type === 'adjustment'
          ? 'Ajuste de saldo'
          : 'Editar movimiento'
        : sheet?.kind === 'category'
          ? (cats.get(sheet.categoryId)?.name ?? 'Sin categoría')
          : 'Cuadrar con el banco'

  const closeSheet = () => setSheet(null)
  const afterEdit = () => setSheet(sheet?.kind === 'edit' && sheet.back ? { kind: 'category', ...sheet.back } : null)

  return (
    <UIContext.Provider value={actions}>
      <div className="app">
        <aside className="desktop-sidebar" aria-label="Navegación de escritorio">
          <div className="desktop-sidebar__brand"><Logo size={38} /><span>Kontrola</span></div>
          <p className="desktop-sidebar__caption">Tus finanzas, claras.</p>
          <button type="button" className="desktop-sidebar__new" onClick={actions.openNewTx}><Plus size={20} /> Nuevo movimiento</button>
          <nav className="desktop-sidebar__nav" aria-label="Principal">
            {[
              ...NAV,
              { route: 'cuentas' as Route, label: 'Cuentas y tarjetas', Icon: CreditCard },
              { route: 'importar' as Route, label: 'Importar movimientos', Icon: FileUp },
            ].map(({ route: r, label, Icon }) => (
              <button key={r} type="button" className={`desktop-sidebar__link ${route === r ? 'is-active' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => navigate(r)}>
                <Icon size={20} aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>
          <button type="button" className={`desktop-sidebar__link desktop-sidebar__settings ${route === 'ajustes' ? 'is-active' : ''}`} aria-current={route === 'ajustes' ? 'page' : undefined} onClick={() => navigate('ajustes')}>
            <SettingsIcon size={20} aria-hidden="true" /> Ajustes
          </button>
        </aside>
        <main className="app__main" id="main">
          {screen}
        </main>

        <nav className="bottom-nav" aria-label="Principal">
          {MOBILE_NAV[0].map(({ route: r, label, short, Icon }) => (
            <NavItem key={r} active={route === r} label={label} short={short} Icon={Icon} onClick={() => navigate(r)} />
          ))}
          <button type="button" className="fab" onClick={actions.openNewTx} aria-label="Registrar gasto o ingreso" title="Registrar (N)">
            <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {MOBILE_NAV[1].map(({ route: r, label, short, Icon }) => (
            <NavItem key={r} active={route === r} label={label} short={short} Icon={Icon} onClick={() => navigate(r)} />
          ))}
        </nav>

        <Sheet open={sheet !== null} title={sheetTitle} onClose={closeSheet}>
          {sheet?.kind === 'adjust' ? (
            <AdjustBalance onDone={closeSheet} />
          ) : sheet?.kind === 'category' ? (
            <CategoryDetail
              categoryId={sheet.categoryId}
              month={sheet.month}
              onSelectTx={(tx) => setSheet({ kind: 'edit', tx, back: { categoryId: sheet.categoryId, month: sheet.month } })}
            />
          ) : sheet?.kind === 'edit' ? (
            <TransactionForm key={sheet.tx.id} editing={sheet.tx} onDone={afterEdit} />
          ) : sheet ? (
            <TransactionForm onDone={closeSheet} />
          ) : null}
        </Sheet>
      </div>
    </UIContext.Provider>
  )
}

function NavItem({
  active,
  label,
  short,
  Icon,
  onClick,
}: {
  active: boolean
  label: string
  short?: string
  Icon: typeof House
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`bottom-nav__item ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      aria-label={short ? label : undefined}
      onClick={onClick}
    >
      <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
      <span>{short ?? label}</span>
    </button>
  )
}
