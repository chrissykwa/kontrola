import { noteSuggestions } from './stats'
import type { AppData, Transaction } from './types'

export interface ImportDraft {
  id: string
  date: string
  note: string
  amount: number
  type: 'expense' | 'income'
  categoryId: string
  selected: boolean
  duplicate: boolean
  original: string
  installments?: number
}

const token = () => Math.random().toString(36).slice(2)
const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const ocrDigits = (s: string) => s.toUpperCase().replace(/[OQU]/g, '0').replace(/[IL|]/g, '1').replace(/Z/g, '2').replace(/S/g, '5').replace(/B/g, '8')
const money = (input: string): number => {
  const clean = input.replace(/[^\d,.-]/g, '')
  const digits = clean.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(/[,.-]/g, '')
  return Math.abs(Number(digits)) || 0
}

function parseDate(raw: string, yearHint: number): string {
  const value = raw.trim().replace(/[.]/g, '/')
  const spanish = value.toLocaleLowerCase('es').match(/^([\dOQUIL|ZSB]{1,2})\s+de\s+(\w+)\s+(?:del?\s+)?([\dOQUIL|ZSB]{4})$/i)
  if (spanish) {
    const day = Number(ocrDigits(spanish[1]))
    const month = months.indexOf(spanish[2]) + 1
    const readYear = Number(ocrDigits(spanish[3]))
    const year = Math.abs(readYear - yearHint) <= 1 ? readYear : yearHint
    if (month > 0 && day > 0 && day <= new Date(year, month, 0).getDate()) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return ''
  }
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  const local = value.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/)
  const y = iso ? Number(iso[1]) : local?.[3] ? Number(local[3].length === 2 ? `20${local[3]}` : local[3]) : yearHint
  const m = Number(iso?.[2] ?? local?.[2])
  const d = Number(iso?.[3] ?? local?.[1])
  if (!y || !m || !d || m > 12 || d > new Date(y, m, 0).getDate()) return ''
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const splitCSV = (line: string, separator: string): string[] => {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) { current += '"'; i++; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === separator && !quoted) { values.push(current.trim()); current = ''; continue }
    current += char
  }
  values.push(current.trim())
  return values
}

function rowsFromCSV(text: string): { date: string; note: string; amount: number; type: 'expense' | 'income'; original: string }[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const headers = splitCSV(lines[0], sep).map((h) => h.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  const idx = (terms: string[]) => headers.findIndex((h) => terms.some((t) => h.includes(t)))
  const dateIndex = idx(['fecha', 'date'])
  const noteIndex = idx(['descripcion', 'detalle', 'glosa', 'comercio', 'concepto', 'merchant'])
  const amountIndex = idx(['monto', 'importe', 'amount', 'valor'])
  const debitIndex = idx(['cargo', 'debito', 'egreso', 'debit'])
  const creditIndex = idx(['abono', 'credito', 'ingreso', 'credit'])
  const typeIndex = idx(['tipo', 'type', 'naturaleza'])
  if (dateIndex < 0 || noteIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) return []
  return lines.slice(1).map((line) => {
    const cells = splitCSV(line, sep)
    const debit = debitIndex >= 0 ? money(cells[debitIndex] ?? '') : 0
    const credit = creditIndex >= 0 ? money(cells[creditIndex] ?? '') : 0
    const raw = amountIndex >= 0 ? cells[amountIndex] ?? '' : ''
    const amount = debit || credit || money(raw)
    const type: 'expense' | 'income' = credit > 0 || (debit === 0 && /abono|ingreso|credito|devolucion/i.test(cells[typeIndex] ?? '')) ? 'income' : 'expense'
    return { date: cells[dateIndex] ?? '', note: cells[noteIndex] ?? '', amount, type, original: line }
  }).filter((r) => r.date || r.amount || r.note)
}

function rowsFromText(text: string): { date: string; note: string; amount: number; type: 'expense' | 'income'; original: string }[] {
  const datePattern = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?)\b/
  const heading = /^([\dOQUIL|ZSB]{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+del?\s+[\dOQUIL|ZSB]{4})$/i
  const amountPattern = /(?:^|\s)([+-]?\s*\$\s*\d{1,3}(?:[.,]\d{3})+|[+-]?\s*\$\s*\d{3,}|[+-]?\d{1,3}(?:[.,]\d{3})+)(?=\s|>|$)/
  const rows: { date: string; note: string; amount: number; type: 'expense' | 'income'; original: string }[] = []
  let sectionDate = ''
  let continuation = ''
  for (const raw of text.split(/\r?\n/)) {
    const original = raw.trim()
    if (!original) continue
    if (/^--- .* ---$/.test(original)) { sectionDate = ''; continuation = ''; continue }
    const section = original.match(heading)
    if (section) { sectionDate = section[1]; continuation = ''; continue }
    const inlineDate = original.match(datePattern)?.[0] ?? ''
    const date = inlineDate || sectionDate
    if (!date) continue // El saldo del encabezado no es un movimiento.
    const content = inlineDate ? original.slice(original.indexOf(inlineDate) + inlineDate.length).trim() : original
    const match = content.match(amountPattern)
    if (!match) {
      const uncertainAmount = content.match(/[+-]?\s*\$?\s*\d+[.,]\d+/)
      if (uncertainAmount && sectionDate) {
        rows.push({ date, note: content.slice(0, uncertainAmount.index).replace(/^[^\p{L}]+/u, '').trim(),
          amount: 0, type: /^\s*\+/.test(uncertainAmount[0]) || /traspaso de/i.test(content) ? 'income' : 'expense', original })
        continuation = ''
        continue
      }
      if (sectionDate && rows.length && rows[rows.length - 1].date === sectionDate && rows[rows.length - 1].note) {
        rows[rows.length - 1].note += ' ' + content.replace(/[<>|]/g, '').trim()
      } else continuation = content
      continue
    }
    const before = content.slice(0, match.index).replace(/^[^\p{L}\d]+/u, '').replace(/[|;]+/g, ' ').trim()
    const note = [continuation, before].filter(Boolean).join(' ').trim()
    const signed = match[1].replace(/\s/g, '')
    rows.push({ date, note, amount: money(signed), type: /^\+/.test(signed) || /\b(abono|credito|devolucion|ingreso|traspaso de)\b/i.test(content) ? 'income' : 'expense', original })
    continuation = ''
  }
  return rows
}

async function readPDF(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = new Map<number, { x: number; text: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5] / 3) * 3
      lines.set(y, [...(lines.get(y) ?? []), { x: item.transform[4], text: item.str }])
    }
    pages.push([...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(' ')).join('\n'))
  }
  return pages.join('\n')
}

export async function extractImportText(file: File, purpose: 'statement' | 'receipt' = 'receipt'): Promise<{ text: string; kind: 'csv' | 'text' }> {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') return { text: await file.text(), kind: 'csv' }
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') return { text: await readPDF(file), kind: 'text' }
  if (file.type.startsWith('image/')) {
    const { createWorker, OEM, PSM } = await import('tesseract.js')
    // Todo desde /ocr de la propia app (ver vite.config.ts), nunca desde un CDN externo.
    const ocr = (path: string) => new URL(`ocr/${path}`, document.baseURI).href
    const worker = await createWorker('spa+eng', OEM.LSTM_ONLY, {
      workerPath: ocr('worker.min.js'),
      corePath: ocr(''),
      langPath: ocr('lang'),
      workerBlobURL: false,
    })
    try {
      const full = (await worker.recognize(file)).data.text
      if (purpose !== 'statement' || typeof createImageBitmap !== 'function') return { text: full, kind: 'text' }
      const image = await createImageBitmap(file)
      const { width, height } = image
      image.close()
      if (height < width * 1.4) return { text: full, kind: 'text' }
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const cropped = (await worker.recognize(file, { rectangle: { left: 0, top: Math.floor(height * 0.33), width, height: height - Math.floor(height * 0.33) } })).data.text
      const score = (s: string) => rowsFromText(s).reduce((n, row) => n + (row.amount > 0 ? 3 : 0) + (row.note ? 1 : 0), 0)
      if (score(cropped) <= score(full)) return { text: full, kind: 'text' }
      const croppedRows = rowsFromText(cropped)
      const year = new Date().getFullYear()
      const missing = rowsFromText(full).filter((row) => row.amount > 0 && row.note && !croppedRows.some((other) =>
        parseDate(other.date, year) === parseDate(row.date, year) && other.amount === row.amount))
      const recovered = missing.map((row) => `${parseDate(row.date, year)} ${row.note} ${row.type === 'income' ? '+' : '-'}$${row.amount.toLocaleString('es-CL')}`).join('\n')
      return { text: cropped + (recovered ? `\n${recovered}` : ''), kind: 'text' }
    }
    finally { await worker.terminate() }
  }
  throw new Error('Usa un archivo CSV, PDF o una imagen.')
}

export function parseImport(text: string, kind: 'csv' | 'text', data: AppData, accountId: string, yearHint = new Date().getFullYear()): ImportDraft[] {
  const rawRows = kind === 'csv' ? rowsFromCSV(text) : rowsFromText(text)
  const suggestions = noteSuggestions(data)
  const existing = data.transactions.filter((t): t is Transaction => (t.accountId ?? 'principal') === accountId)
  const seen = new Set(existing.map((t) => `${t.date}|${t.type}|${t.amount}|${t.note.toLocaleLowerCase('es')}`))
  const merchantKey = (s: string) => s.toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b\d+\b/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
  return rawRows.map((r) => {
    const date = parseDate(r.date, yearHint)
    const key = merchantKey(r.note)
    const learned = suggestions.find((s) => s.type === r.type && s.note.toLocaleLowerCase('es') === r.note.toLocaleLowerCase('es'))
      ?? (key.length >= 4 ? suggestions.find((s) => s.type === r.type && s.categoryId && merchantKey(s.note) === key) : undefined)
    const fingerprint = `${date}|${r.type}|${r.amount}|${r.note.toLocaleLowerCase('es')}`
    const duplicate = !!date && seen.has(fingerprint)
    if (date) seen.add(fingerprint)
    return { id: token(), date, note: r.note, amount: r.amount, type: r.type,
      categoryId: learned?.categoryId ?? '', selected: !duplicate, duplicate, original: r.original }
  })
}
