import { ArrowLeft, FileUp } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { useToast } from '../components/Toast'
import { AmountInput } from '../components/AmountInput'
import { today } from '../lib/dates'
import { extractImportText, parseImport, type ImportDraft } from '../lib/imports'
import { formatCLP } from '../lib/money'
import { creditBills, creditCycle, expenseCategories, incomeCategories } from '../lib/stats'
import type { Transaction } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

export function ImportMovements() {
  const { data, addTransactions } = useStore()
  const ui = useUI()
  const toast = useToast()
  const [accountId, setAccountId] = useState(data.settings.accounts.find((a) => a.kind === 'cash' && !a.archived)?.id ?? 'principal')
  const [drafts, setDrafts] = useState<ImportDraft[]>([])
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [statementTotal, setStatementTotal] = useState<number | null>(null)
  const [statementDue, setStatementDue] = useState('')
  const missingCategoryType = drafts.some((r) => r.selected && !r.categoryId && r.type === 'expense') ? 'expense'
    : drafts.some((r) => r.selected && !r.categoryId && r.type === 'income') ? 'income' : null
  const account = data.settings.accounts.find((a) => a.id === accountId)
  const update = (id: string, patch: Partial<ImportDraft>) => setDrafts((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r))
  const processFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      const all: ImportDraft[] = []
      const texts: string[] = []
      for (const file of files) {
        const extracted = await extractImportText(file, 'statement')
        texts.push(`--- ${file.name} ---\n${extracted.text}`)
        all.push(...parseImport(extracted.text, extracted.kind, data, accountId))
      }
      setRawText(texts.join('\n'))
      setDrafts(all.map((r) => ({ ...r, installments: account?.kind === 'credit' ? account.defaultInstallments ?? 1 : undefined,
        selected: r.selected && !(account?.kind === 'credit' && r.type === 'income') })))
      if (!all.length) setError('No se encontraron filas completas. Puedes corregir el texto leído y volver a analizarlo.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo leer el archivo') }
    finally { setBusy(false); event.target.value = '' }
  }
  const selected = drafts.filter((r) => r.selected)
  const valid = selected.filter((r) => r.date && r.note.trim() && r.amount > 0 && r.categoryId && !(account?.kind === 'credit' && r.type === 'income') && (account?.kind !== 'credit' || (r.installments ?? 1) >= 1))
  const dueDate = account?.kind === 'credit' ? statementDue || creditBills(data, accountId).find((b) => b.amount > 0)?.dueDate || creditCycle(today(), account).dueDate : ''
  const recordedBill = account?.kind === 'credit' ? creditBills(data, accountId).find((b) => b.dueDate === dueDate)?.amount ?? 0 : 0
  const pendingBill = account?.kind === 'credit' ? (creditBills({ ...data, transactions: [...data.transactions, ...valid.map((r): Transaction => ({
    id: r.id, type: r.type, amount: r.amount, date: r.date, note: r.note, categoryId: r.categoryId, accountId,
    installments: r.installments, createdAt: 0,
  }))] }, accountId).find((b) => b.dueDate === dueDate)?.amount ?? 0) - recordedBill : 0
  const difference = statementTotal === null ? null : statementTotal - recordedBill - pendingBill
  const importSelected = () => {
    if (!valid.length || valid.length !== selected.length) return
    addTransactions(valid.map((r) => ({ type: r.type, amount: r.amount, date: r.date, note: r.note.trim(), categoryId: r.categoryId, accountId, installments: account?.kind === 'credit' ? r.installments : undefined })))
    toast({ message: `${valid.length} movimientos importados` })
    setDrafts([])
    setRawText('')
    ui.navigate('movimientos')
  }
  return <div className="screen">
    <header className="topbar topbar--back"><button type="button" className="icon-btn icon-btn--surface" onClick={() => ui.navigate('movimientos')} aria-label="Volver a movimientos"><ArrowLeft size={20} /></button><h1 className="topbar__title">Importar movimientos</h1></header>
    <section className="settings-group">
      <h2 className="settings-group__title">Estado de cuenta o pantallazos</h2>
      <p className="lead">Sube un CSV, PDF o varias imágenes. Revisa cada fila antes de guardarla.</p>
      <div className="field"><label htmlFor="import-account" className="field__label">Cuenta o tarjeta de estos movimientos</label>
        <select id="import-account" className="input" value={accountId} onChange={(e) => { setAccountId(e.target.value); setDrafts([]); setStatementDue(''); setStatementTotal(null) }}>
          {data.settings.accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></div>
      <label className="btn btn--primary btn--block import-file"><FileUp size={18} /> {busy ? 'Leyendo archivo…' : 'Seleccionar archivos'}
        <input type="file" accept=".csv,.pdf,image/*" multiple onChange={processFiles} disabled={busy} />
      </label>
      <p className="hint">La lectura ocurre en tu navegador. El OCR puede descargar su modelo de idioma la primera vez; no envía tu imagen para reconocerla.</p>
      {account?.kind === 'credit' && <p className="alert alert--info">Los abonos de la tarjeta se registran como traspaso desde la cuenta con la que pagaste. Aquí se importan sus compras.</p>}
      {account?.kind === 'credit' && <div className="card import-reconcile">
        <h3>Cuadrar estado de cuenta</h3>
        <div className="field"><label className="field__label" htmlFor="statement-due">Vencimiento del estado</label><input id="statement-due" className="input" type="date" value={dueDate} onChange={(e) => setStatementDue(e.target.value)} /></div>
        <div className="field"><label className="field__label" htmlFor="statement-total">Total facturado a pagar</label><AmountInput id="statement-total" value={statementTotal} onChange={setStatementTotal} /></div>
        {difference !== null && <div className="import-reconcile__result" role="status">
          <span>Ya registrado: {formatCLP(recordedBill)}</span><span>Seleccionado para importar: {formatCLP(pendingBill)}</span>
          <strong>{difference === 0 ? 'El total cuadra' : difference > 0 ? `Faltan ${formatCLP(difference)} por explicar` : `Kontrola supera el estado por ${formatCLP(-difference)}`}</strong>
        </div>}
        <p className="hint">Compara el total pendiente de un ciclo. Las cuotas sin interés se reparten por vencimiento; pagos, intereses o devoluciones pueden requerir revisión manual.</p>
      </div>}
      {error && <p className="alert alert--info" role="alert">{error}</p>}
    </section>

    {rawText && <section className="settings-group"><details><summary>Ver o corregir el texto extraído</summary>
      <textarea className="input import-raw" value={rawText} onChange={(e) => setRawText(e.target.value)} aria-label="Texto extraído" />
      <button type="button" className="btn" onClick={() => setDrafts(parseImport(rawText, 'text', data, accountId))}>Volver a analizar texto</button>
    </details></section>}

    {drafts.length > 0 && <section className="settings-group">
      <h2 className="settings-group__title">Revisa {drafts.length} filas</h2>
      <p className="hint">{selected.length} seleccionadas · {drafts.filter((r) => r.duplicate).length} posibles duplicados. El OCR puede confundir cifras: confirma cada monto con el banco antes de incorporar.</p>
      {missingCategoryType && <div className="field">
        <label htmlFor="bulk-category" className="field__label">Completar categorías pendientes</label>
        <div className="import-bulk"><select id="bulk-category" className="input" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}><option value="">Elige categoría</option>
          {(missingCategoryType === 'expense' ? expenseCategories(data) : incomeCategories(data)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button type="button" className="btn" disabled={!bulkCategory || !data.categories.some((c) => c.id === bulkCategory && c.kind === missingCategoryType)} onClick={() => { setDrafts((rows) => rows.map((r) => r.selected && r.type === missingCategoryType && !r.categoryId ? { ...r, categoryId: bulkCategory } : r)); setBulkCategory('') }}>Aplicar</button></div>
      </div>}
      <div className="import-list">{drafts.map((row, index) => <div key={row.id} className={`card import-row ${row.duplicate ? 'import-row--duplicate' : ''}`}>
        <label className="check"><input type="checkbox" checked={row.selected} onChange={(e) => update(row.id, { selected: e.target.checked })} /> Movimiento {index + 1}{row.duplicate ? ' · posible duplicado' : ''}</label>
        <div className="import-grid">
          <label>Fecha<input className="input" type="date" value={row.date} max={today()} onChange={(e) => update(row.id, { date: e.target.value })} /></label>
          <label>Tipo<select className="input" value={row.type} onChange={(e) => update(row.id, { type: e.target.value as 'expense' | 'income', categoryId: '' })}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>
          <label className="import-grid__wide">Detalle<input className="input" value={row.note} onChange={(e) => update(row.id, { note: e.target.value })} /></label>
          <label>Monto CLP<input className="input" type="number" min="1" value={row.amount || ''} onChange={(e) => update(row.id, { amount: Number(e.target.value) })} /></label>
          {account?.kind === 'credit' && row.type === 'expense' && <label>Cuotas sin interés<input className="input" type="number" min="1" max="60" value={row.installments ?? 1} onChange={(e) => update(row.id, { installments: Number(e.target.value) })} /></label>}
          <label>Categoría<select className="input" value={row.categoryId} onChange={(e) => update(row.id, { categoryId: e.target.value })}><option value="">Por completar</option>
            {(row.type === 'expense' ? expenseCategories(data) : incomeCategories(data)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        <p className="muted small import-original">Leído: {row.original}</p>
      </div>)}</div>
      <button type="button" className="btn btn--primary btn--block" disabled={!valid.length || valid.length !== selected.length} onClick={importSelected}>
        Incorporar {valid.length} movimientos{valid.length ? ` · ${formatCLP(valid.reduce((sum, r) => sum + r.amount, 0))}` : ''}
      </button>
      {selected.length !== valid.length && <p className="hint">Hay {selected.length - valid.length} fila(s) seleccionada(s) con datos por completar.</p>}
      {account?.kind === 'credit' && selected.some((r) => r.type === 'income') && <p className="hint">Los abonos deben registrarse como traspasos, no como ingresos de la tarjeta.</p>}
    </section>}
  </div>
}
