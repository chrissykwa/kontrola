import { Archive, ArchiveRestore } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CATEGORY_COLORS } from '../lib/defaults'
import { newId } from '../lib/storage'
import type { Category } from '../lib/types'
import { useStore } from '../state/store'
import { CATEGORY_ICONS, CategoryIcon, ICON_LABELS } from './Icon'
import { useToast } from './Toast'

export function CategoryEditor({
  category,
  kind,
  onDone,
}: {
  category?: Category
  kind: Category['kind']
  onDone: () => void
}) {
  const { upsertCategory } = useStore()
  const toast = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'sparkles')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])

  const save = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    upsertCategory({
      id: category?.id ?? newId(),
      kind: category?.kind ?? kind,
      budget: category?.budget ?? 0,
      archived: category?.archived,
      name: trimmed,
      icon,
      color,
    })
    toast({ message: category ? 'Categoría actualizada' : `Categoría "${trimmed}" creada` })
    onDone()
  }

  return (
    <form className="form" onSubmit={save}>
      <div className="cat-preview">
        <CategoryIcon category={{ icon, color }} size="lg" />
        <span>{name.trim() || 'Nueva categoría'}</span>
      </div>

      <div className="field">
        <label htmlFor="cat-name" className="field__label">
          Nombre
        </label>
        <input
          id="cat-name"
          className="input"
          value={name}
          maxLength={28}
          data-autofocus={category ? undefined : ''}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Mascota, Gimnasio"
          required
        />
      </div>

      <fieldset className="field">
        <legend className="field__label">Ícono</legend>
        <div className="icon-grid" role="radiogroup" aria-label="Ícono">
          {Object.entries(CATEGORY_ICONS).map(([key, Glyph]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={icon === key}
              aria-label={ICON_LABELS[key] ?? key}
              className={`icon-option ${icon === key ? 'is-active' : ''}`}
              onClick={() => setIcon(key)}
            >
              <Glyph size={20} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Color</legend>
        <div className="swatches" role="radiogroup" aria-label="Color">
          {CATEGORY_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Color ${i + 1}`}
              className={`swatch ${color === c ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>

      <div className="form__actions">
        {category && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              upsertCategory({ ...category, archived: !category.archived })
              toast({ message: category.archived ? 'Categoría restaurada' : 'Categoría archivada' })
              onDone()
            }}
          >
            {category.archived ? <ArchiveRestore size={18} aria-hidden="true" /> : <Archive size={18} aria-hidden="true" />}
            {category.archived ? 'Restaurar' : 'Archivar'}
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={!name.trim()}>
          Guardar
        </button>
      </div>
      {category && !category.archived && (
        <p className="hint">Archivar la oculta al registrar, pero mantiene tus movimientos anteriores.</p>
      )}
    </form>
  )
}
