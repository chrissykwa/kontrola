import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Landmark,
  Plus,
  Scale,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { AmountInput } from '../components/AmountInput'
import { CategoryEditor } from '../components/CategoryEditor'
import { CategoryIcon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { createInitialData } from '../lib/defaults'
import { formatCLP } from '../lib/money'
import { exportCSV, exportJSON, importJSON } from '../lib/storage'
import type { Category, ThemePref } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type SheetState =
  | { kind: 'opening' }
  | { kind: 'category'; category?: Category; catKind: Category['kind'] }
  | { kind: 'reset' }
  | null

export function Settings() {
  const { data, updateSettings, replaceAll } = useStore()
  const ui = useUI()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [openingDraft, setOpeningDraft] = useState<number | null>(null)
  const [catTab, setCatTab] = useState<Category['kind']>('expense')
  const [resetText, setResetText] = useState('')

  const stamp = new Date().toISOString().slice(0, 10)
  const categories = data.categories.filter((c) => c.kind === catTab)

  const onImport = async (file: File) => {
    try {
      const next = importJSON(await file.text())
      replaceAll(next)
      toast({ message: `Respaldo importado: ${next.transactions.length} movimientos` })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'No se pudo importar el archivo' })
    }
  }

  const saveOpening = (e: FormEvent) => {
    e.preventDefault()
    updateSettings({ openingBalance: openingDraft ?? 0 })
    toast({ message: 'Saldo inicial actualizado' })
    setSheet(null)
  }

  return (
    <div className="screen">
      <header className="topbar topbar--back">
        <button type="button" className="icon-btn icon-btn--surface" onClick={() => ui.navigate('inicio')} aria-label="Volver al inicio">
          <ArrowLeft size={20} />
        </button>
        <h1 className="topbar__title">Ajustes</h1>
      </header>

      <section className="settings-group" aria-labelledby="s-saldo">
        <h2 id="s-saldo" className="settings-group__title">
          Saldo
        </h2>
        <div className="card card--list">
          <button
            type="button"
            className="settings-row"
            onClick={() => {
              setOpeningDraft(data.settings.openingBalance || null)
              setSheet({ kind: 'opening' })
            }}
          >
            <Wallet size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Saldo inicial</span>
              <span className="muted small">Con cuánto partiste a usar Kontrola</span>
            </span>
            <span className="settings-row__value">{formatCLP(data.settings.openingBalance)}</span>
            <ChevronRight size={18} aria-hidden="true" className="muted" />
          </button>
          <button type="button" className="settings-row" onClick={ui.openAdjust}>
            <Scale size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Cuadrar con el banco</span>
              <span className="muted small">Corrige la diferencia con tu saldo real</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="muted" />
          </button>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="s-cats">
        <div className="settings-group__head">
          <h2 id="s-cats" className="settings-group__title">
            Categorías
          </h2>
          <div className="segmented segmented--sm" role="radiogroup" aria-label="Tipo de categoría">
            {(['expense', 'income'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={catTab === k}
                className={`segmented__opt ${catTab === k ? 'is-active' : ''}`}
                onClick={() => setCatTab(k)}
              >
                {k === 'expense' ? 'Gastos' : 'Ingresos'}
              </button>
            ))}
          </div>
        </div>
        <div className="card card--list">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`settings-row ${c.archived ? 'is-archived' : ''}`}
              onClick={() => setSheet({ kind: 'category', category: c, catKind: c.kind })}
            >
              <CategoryIcon category={c} size="sm" />
              <span className="settings-row__text">
                <span>{c.name}</span>
                {c.archived && <span className="muted small">Archivada</span>}
              </span>
              <ChevronRight size={18} aria-hidden="true" className="muted" />
            </button>
          ))}
          <button type="button" className="settings-row settings-row--add" onClick={() => setSheet({ kind: 'category', catKind: catTab })}>
            <Plus size={20} aria-hidden="true" />
            <span className="settings-row__text">Nueva categoría</span>
          </button>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="s-theme">
        <h2 id="s-theme" className="settings-group__title">
          Apariencia
        </h2>
        <div className="segmented" role="radiogroup" aria-labelledby="s-theme">
          {(
            [
              ['system', 'Automático'],
              ['light', 'Claro'],
              ['dark', 'Oscuro'],
            ] as [ThemePref, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={data.settings.theme === v}
              className={`segmented__opt ${data.settings.theme === v ? 'is-active' : ''}`}
              onClick={() => updateSettings({ theme: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-group" aria-labelledby="s-data">
        <h2 id="s-data" className="settings-group__title">
          Tus datos
        </h2>
        <p className="hint">
          Todo se guarda solo en este navegador. Descarga un respaldo de vez en cuando para no perder nada si cambias de
          celular o borras los datos del navegador.
        </p>
        <div className="card card--list">
          <button
            type="button"
            className="settings-row"
            onClick={() => {
              download(`kontrola-respaldo-${stamp}.json`, exportJSON(data), 'application/json')
              toast({ message: 'Respaldo descargado' })
            }}
          >
            <Download size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Descargar respaldo</span>
              <span className="muted small">Archivo .json con todo</span>
            </span>
          </button>
          <button type="button" className="settings-row" onClick={() => fileInput.current?.click()}>
            <Upload size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Restaurar respaldo</span>
              <span className="muted small">Reemplaza los datos actuales</span>
            </span>
          </button>
          <button
            type="button"
            className="settings-row"
            onClick={() => download(`kontrola-movimientos-${stamp}.csv`, '﻿' + exportCSV(data), 'text/csv;charset=utf-8')}
          >
            <FileSpreadsheet size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Exportar a Excel</span>
              <span className="muted small">Archivo .csv con todos los movimientos</span>
            </span>
          </button>
          <button type="button" className="settings-row settings-row--danger" onClick={() => setSheet({ kind: 'reset' })}>
            <Trash2 size={20} aria-hidden="true" />
            <span className="settings-row__text">Borrar todo</span>
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
      </section>

      <section className="settings-group" aria-labelledby="s-soon">
        <h2 id="s-soon" className="settings-group__title">
          Próximamente
        </h2>
        <div className="card card--list">
          <div className="settings-row is-static">
            <Bot size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Asistente con IA</span>
              <span className="muted small">Pregúntale "¿cuánto gasté en comida?" o pídele consejos para ahorrar</span>
            </span>
          </div>
          <div className="settings-row is-static">
            <Landmark size={20} aria-hidden="true" />
            <span className="settings-row__text">
              <span>Conexión con tu banco</span>
              <span className="muted small">Que los movimientos lleguen solos</span>
            </span>
          </div>
        </div>
      </section>

      <p className="footnote">Kontrola v0.1 · hecho a tu medida</p>

      <Sheet open={sheet?.kind === 'opening'} title="Saldo inicial" onClose={() => setSheet(null)}>
        <form className="form" onSubmit={saveOpening}>
          <div className="field">
            <label htmlFor="opening" className="field__label">
              ¿Cuánto tenías en la cuenta al empezar?
            </label>
            <AmountInput id="opening" value={openingDraft} onChange={setOpeningDraft} autoFocus describedBy="opening-help" />
            <p id="opening-help" className="hint">
              Tu saldo = saldo inicial + ingresos − gastos. Si solo quieres corregir una diferencia de hoy, usa "Cuadrar con
              el banco".
            </p>
          </div>
          <button type="submit" className="btn btn--primary btn--block">
            Guardar
          </button>
        </form>
      </Sheet>

      <Sheet
        open={sheet?.kind === 'category'}
        title={sheet?.kind === 'category' && sheet.category ? 'Editar categoría' : 'Nueva categoría'}
        onClose={() => setSheet(null)}
      >
        {sheet?.kind === 'category' && (
          <CategoryEditor category={sheet.category} kind={sheet.catKind} onDone={() => setSheet(null)} />
        )}
      </Sheet>

      <Sheet
        open={sheet?.kind === 'reset'}
        title="Borrar todo"
        onClose={() => {
          setSheet(null)
          setResetText('')
        }}
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (resetText.trim().toLowerCase() !== 'borrar') return
            replaceAll(createInitialData())
            setSheet(null)
            setResetText('')
            ui.navigate('inicio')
          }}
        >
          <p className="lead">
            Se eliminarán tus {data.transactions.length} movimientos, categorías y presupuestos. Esto no se puede deshacer.
          </p>
          <div className="field">
            <label htmlFor="reset-confirm" className="field__label">
              Escribe <strong>borrar</strong> para confirmar
            </label>
            <input
              id="reset-confirm"
              className="input"
              autoComplete="off"
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--danger btn--block" disabled={resetText.trim().toLowerCase() !== 'borrar'}>
            Borrar todos mis datos
          </button>
        </form>
      </Sheet>
    </div>
  )
}
