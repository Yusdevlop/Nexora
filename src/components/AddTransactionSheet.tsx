import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { supabase } from '../lib/supabase'
import { TYPE_LABEL } from '../lib/categories'
import { useCategories } from '../context/CategoriesContext'
import { CategoryManageSheet } from './CategoryManageSheet'
import { friendlyError, parseAmount, todayISO, yesterdayISO, currentMonthKey, monthKey, money } from '../lib/format'
import type { Transaction, TxType } from '../lib/types'
import { useTransactions } from '../context/DataContext'

interface Props {
  open: boolean
  onClose: () => void
  initialType?: TxType
  editing?: Transaction | null
}

const TYPES: TxType[] = ['expense', 'income', 'saving']

export function AddTransactionSheet({ open, onClose, initialType = 'expense', editing = null }: Props) {
  const toast = useToast()
  const { items, refresh } = useTransactions()
  const { byType, find } = useCategories()
  const [type, setType] = useState<TxType>(initialType)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [managingCats, setManagingCats] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    const t = editing?.type ?? initialType
    setType(t)
    setAmount(editing ? String(editing.amount).replace('.', ',') : '')
    setCategory(editing?.category ?? byType[t][0]?.name ?? '')
    setNote(editing?.note ?? '')
    setDate(editing?.occurred_on ?? todayISO())
    setErr('')
    setBusy(false)
    setManagingCats(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, initialType])

  const pickType = (t: TxType) => {
    setType(t)
    if (!byType[t].some((c) => c.name === category)) setCategory(byType[t][0]?.name ?? '')
  }

  const limitWarning = (() => {
    if (type !== 'expense' || monthKey(date) !== currentMonthKey()) return null
    const cat = find('expense', category)
    if (!cat?.monthly_limit) return null
    const value = parseAmount(amount)
    if (value <= 0) return null
    const spentBefore = items
      .filter((t) => t.type === 'expense' && t.category === category && monthKey(t.occurred_on) === currentMonthKey() && t.id !== editing?.id)
      .reduce((s, t) => s + t.amount, 0)
    const after = spentBefore + value
    if (after <= cat.monthly_limit) return null
    return `Bu əməliyyatla "${category}" limitini keçəcəksiniz: ${money(after)} / ${money(cat.monthly_limit)}.`
  })()

  const save = async () => {
    const value = parseAmount(amount)
    if (value <= 0) return setErr('Məbləği yazın.')
    if (value > 999999999) return setErr('Məbləğ çox böyükdür.')
    if (!navigator.onLine) return setErr('İnternet yoxdur. Əməliyyat əlavə etmək üçün bağlantı lazımdır.')
    setBusy(true)
    setErr('')
    const payload = { type, amount: value, category, note: note.trim(), occurred_on: date }
    const { error } = editing
      ? await supabase.from('transactions').update(payload).eq('id', editing.id)
      : await supabase.from('transactions').insert(payload)
    if (error) {
      setBusy(false)
      return setErr(friendlyError(error))
    }
    await refresh()
    toast(editing ? 'Dəyişikliklər yadda saxlandı' : `${TYPE_LABEL[type]} əlavə olundu`, 'success')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Əməliyyatı redaktə et' : 'Yeni əməliyyat'}>
      <div className="add" data-type={type}>
        <div className="segmented" role="tablist">
          {TYPES.map((t) => (
            <button key={t} role="tab" aria-selected={type === t} className={type === t ? 'on' : ''} data-type={t} onClick={() => pickType(t)}>
              <Icon name={t} size={18} />
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <label className="amount-field">
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.,\s]/g, ''))
              setErr('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            aria-label="Məbləğ"
          />
          <span>AZN</span>
        </label>

        <div className="chips" role="radiogroup" aria-label="Kateqoriya">
          {byType[type].map((c) => (
            <button key={c.id} role="radio" aria-checked={category === c.name} className={`chip${category === c.name ? ' on' : ''}`} onClick={() => setCategory(c.name)}>
              <span aria-hidden>{c.emoji}</span> {c.name}
            </button>
          ))}
          <button type="button" className="chip chip-add" onClick={() => setManagingCats(true)}>
            <Icon name="plus" size={14} /> Yeni
          </button>
        </div>

        <input className="field" placeholder="Qeyd (istəyə bağlı)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="date-row">
          <button className={`chip${date === todayISO() ? ' on' : ''}`} onClick={() => setDate(todayISO())}>
            Bu gün
          </button>
          <button className={`chip${date === yesterdayISO() ? ' on' : ''}`} onClick={() => setDate(yesterdayISO())}>
            Dünən
          </button>
          <input className="field date" type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Tarix" />
        </div>

        {limitWarning && !err && (
          <p className="form-warning" role="alert">
            ⚠️ {limitWarning}
          </p>
        )}
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        <button className="btn btn-accent" disabled={busy || !category} onClick={() => void save()}>
          {busy ? 'Saxlanılır…' : editing ? 'Yadda saxla' : `${TYPE_LABEL[type]} əlavə et`}
        </button>
      </div>
      <CategoryManageSheet open={managingCats} onClose={() => setManagingCats(false)} type={type} onCreated={(name) => setCategory(name)} />
    </Sheet>
  )
}
