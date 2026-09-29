import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { useCategories } from '../context/CategoriesContext'
import { CATEGORY_COLORS, EMOJI_CHOICES, TYPE_LABEL } from '../lib/categories'
import { friendlyError, money, parseAmount } from '../lib/format'
import type { Category, TxType } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  type: TxType
  /** AddTransactionSheet-dən açılanda: yeni kateqoriya yaradılan kimi onu seçmək üçün */
  onCreated?: (name: string) => void
}

function EditorForm({
  type,
  editing,
  onDone,
  onCancel
}: {
  type: TxType
  editing: Category | null
  onDone: (name: string) => void
  onCancel: () => void
}) {
  const toast = useToast()
  const { add, update } = useCategories()
  const [name, setName] = useState(editing?.name ?? '')
  const [emoji, setEmoji] = useState(editing?.emoji ?? EMOJI_CHOICES[0])
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[0])
  const [limit, setLimit] = useState(editing?.monthly_limit != null ? String(editing.monthly_limit).replace('.', ',') : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (name.trim().length < 1) return setErr('Kateqoriyanın adını yazın.')
    const monthlyLimit = type === 'expense' && limit.trim() ? parseAmount(limit) : null
    setBusy(true)
    setErr('')
    try {
      if (editing) await update(editing.id, { name, emoji, color, monthly_limit: monthlyLimit })
      else await add(type, name, emoji, color, monthlyLimit)
      toast(editing ? 'Kateqoriya yeniləndi' : 'Kateqoriya əlavə olundu', 'success')
      onDone(name.trim())
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form cat-editor">
      <div className="cat-preview">
        <span className="cat-preview-badge" style={{ background: color }}>
          {emoji}
        </span>
        <input className="field" autoFocus placeholder="Kateqoriyanın adı (məs. Ev heyvanı)" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="label">
        İkon
        <div className="emoji-grid">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} type="button" className={`emoji-cell${emoji === e ? ' on' : ''}`} onClick={() => setEmoji(e)} aria-label={e}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="label">
        Rəng
        <div className="color-grid">
          {CATEGORY_COLORS.map((c) => (
            <button key={c} type="button" className={`color-cell${color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
      </div>

      {type === 'expense' && (
        <label className="label">
          Aylıq limit (istəyə bağlı)
          <input
            className="field"
            inputMode="decimal"
            placeholder={`Məs. 300 — keçəndə xəbərdarlıq görəcəksiniz`}
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^0-9.,\s]/g, ''))}
          />
          {editing?.monthly_limit != null && <small className="muted">Hazırkı limit: {money(editing.monthly_limit)}</small>}
        </label>
      )}

      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
      <div className="row-actions">
        <button className="btn btn-soft" onClick={onCancel}>
          Ləğv et
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saxlanılır…' : editing ? 'Yadda saxla' : 'Əlavə et'}
        </button>
      </div>
    </div>
  )
}

export function CategoryManageSheet({ open, onClose, type, onCreated }: Props) {
  const toast = useToast()
  const { byType, remove } = useCategories()
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEditing(null)
      setCreating(!!onCreated) // AddTransactionSheet-dən açılanda birbaşa forma göstər, Profildən siyahı
      setConfirm(null)
    }
  }, [open, onCreated])

  const list = byType[type]

  const del = async (c: Category) => {
    if (confirm !== c.id) return setConfirm(c.id)
    setConfirm(null)
    try {
      await remove(c.id)
      toast('Kateqoriya silindi', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }

  const showForm = creating || editing

  return (
    <Sheet open={open} onClose={onClose} title={showForm ? (editing ? 'Kateqoriyanı redaktə et' : 'Yeni kateqoriya') : `${TYPE_LABEL[type]} kateqoriyaları`}>
      {showForm ? (
        <EditorForm
          type={type}
          editing={editing}
          onCancel={() => (onCreated && !editing ? onClose() : (setCreating(false), setEditing(null)))}
          onDone={(name) => {
            if (onCreated) {
              onCreated(name)
              onClose()
            } else {
              setCreating(false)
              setEditing(null)
            }
          }}
        />
      ) : (
        <div className="form">
          <div className="card list cat-list">
            {list.map((c) => (
              <div key={c.id} className="cat-row">
                <span className="cat-preview-badge" style={{ background: c.color }}>
                  {c.emoji}
                </span>
                <span className="cat-row-name">
                  {c.name}
                  {c.monthly_limit != null && <small className="muted"> · limit {c.monthly_limit} AZN</small>}
                </span>
                <button className="icon-btn" aria-label="Redaktə et" onClick={() => setEditing(c)}>
                  <Icon name="edit" size={18} />
                </button>
                <button className={`icon-btn${confirm === c.id ? ' danger' : ''}`} aria-label="Sil" onClick={() => void del(c)}>
                  {confirm === c.id ? <span className="confirm-text">Sil?</span> : <Icon name="trash" size={18} />}
                </button>
              </div>
            ))}
            {list.length === 0 && <p className="muted small" style={{ padding: '12px 8px' }}>Hələ kateqoriya yoxdur.</p>}
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> Yeni kateqoriya
          </button>
        </div>
      )}
    </Sheet>
  )
}
