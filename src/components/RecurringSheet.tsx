import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { useRecurring } from '../context/RecurringContext'
import { useCategories } from '../context/CategoriesContext'
import { TYPE_LABEL } from '../lib/categories'
import { friendlyError, money, parseAmount } from '../lib/format'
import type { Recurring, TxType } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

const TYPES: TxType[] = ['expense', 'income', 'saving']

function Form({ editing, onDone }: { editing: Recurring | null; onDone: () => void }) {
  const toast = useToast()
  const { add, update } = useRecurring()
  const { byType } = useCategories()
  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [amount, setAmount] = useState(editing ? String(editing.amount).replace('.', ',') : '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [day, setDay] = useState(String(editing?.day_of_month ?? 1))
  const [note, setNote] = useState(editing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!category && byType[type][0]) setCategory(byType[type][0].name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const save = async () => {
    const value = parseAmount(amount)
    const d = Math.min(28, Math.max(1, Math.round(Number(day)) || 1))
    if (value <= 0) return setErr('Məbləği yazın.')
    if (!category) return setErr('Kateqoriya seçin.')
    setBusy(true)
    setErr('')
    try {
      if (editing) await update(editing.id, { amount: value, category, day_of_month: d, note: note.trim() })
      else await add({ type, amount: value, category, note: note.trim(), day_of_month: d })
      toast(editing ? 'Yeniləndi' : 'Təkrarlanan əməliyyat əlavə olundu', 'success')
      onDone()
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form">
      {!editing && (
        <div className="segmented" role="tablist">
          {TYPES.map((t) => (
            <button key={t} role="tab" aria-selected={type === t} className={type === t ? 'on' : ''} data-type={t} onClick={() => setType(t)}>
              <Icon name={t} size={18} />
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      <label className="amount-field">
        <input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,\s]/g, ''))} />
        <span>AZN</span>
      </label>
      <div className="label">
        Kateqoriya
        <div className="chips">
          {byType[type].map((c) => (
            <button key={c.id} className={`chip${category === c.name ? ' on' : ''}`} onClick={() => setCategory(c.name)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>
      <label className="label">
        Ayın neçənci günü təkrarlansın
        <input className="field" inputMode="numeric" placeholder="Məs. 1" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
      </label>
      <input className="field" placeholder="Qeyd (məs. Kirayə)" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="form-error" role="alert">{err}</p>}
      <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>
        {busy ? 'Saxlanılır…' : editing ? 'Yadda saxla' : 'Əlavə et'}
      </button>
    </div>
  )
}

export function RecurringSheet({ open, onClose }: Props) {
  const toast = useToast()
  const { items, update, remove } = useRecurring()
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEditing(null)
      setCreating(false)
      setConfirm(null)
    }
  }, [open])

  const del = async (id: string) => {
    if (confirm !== id) return setConfirm(id)
    setConfirm(null)
    try {
      await remove(id)
      toast('Silindi', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }

  const toggle = async (r: Recurring) => {
    try {
      await update(r.id, { active: !r.active })
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }

  const showForm = creating || editing

  return (
    <Sheet open={open} onClose={onClose} title={showForm ? (editing ? 'Redaktə et' : 'Yeni təkrarlanan əməliyyat') : 'Təkrarlanan əməliyyatlar'}>
      {showForm ? (
        <Form editing={editing} onDone={() => { setCreating(false); setEditing(null) }} />
      ) : (
        <div className="form">
          <p className="muted small">Hər ay seçdiyiniz gündə avtomatik əlavə olunur (məs. maaş, kirayə, abunəlik).</p>
          <div className="card list">
            {items.map((r) => (
              <div key={r.id} className="cat-row">
                <span className="cat-preview-badge" style={{ background: r.active ? '#5BE3C0' : '#93A1BB' }} data-type={r.type}>
                  <Icon name={r.type} size={16} />
                </span>
                <span className="cat-row-name">
                  {r.category} · {money(r.amount)}
                  <small className="muted"> · hər ay {r.day_of_month}-də{!r.active ? ' · dayandırılıb' : ''}</small>
                </span>
                <button className="icon-btn" aria-label={r.active ? 'Dayandır' : 'Aktivləşdir'} onClick={() => void toggle(r)}>
                  <Icon name={r.active ? 'eye' : 'eyeoff'} size={18} />
                </button>
                <button className="icon-btn" aria-label="Redaktə et" onClick={() => setEditing(r)}>
                  <Icon name="edit" size={18} />
                </button>
                <button className={`icon-btn${confirm === r.id ? ' danger' : ''}`} aria-label="Sil" onClick={() => void del(r.id)}>
                  {confirm === r.id ? <span className="confirm-text">Sil?</span> : <Icon name="trash" size={18} />}
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="muted small" style={{ padding: '12px 8px' }}>Hələ təkrarlanan əməliyyat yoxdur.</p>}
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> Yeni əlavə et
          </button>
        </div>
      )}
    </Sheet>
  )
}
