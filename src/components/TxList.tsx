import { useMemo, useState } from 'react'
import type { Transaction } from '../lib/types'
import { dayLabel, money, signedMoney } from '../lib/format'
import { TYPE_LABEL } from '../lib/categories'
import { useCategories, categoryFallback } from '../context/CategoriesContext'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { AddTransactionSheet } from './AddTransactionSheet'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/format'
import { useTransactions } from '../context/DataContext'

function Row({ t, onOpen }: { t: Transaction; onOpen: (t: Transaction) => void }) {
  const sign = t.type === 'income' ? 1 : -1
  const { find } = useCategories()
  const cat = find(t.type, t.category) ?? categoryFallback(t.category)
  return (
    <button className="tx" onClick={() => onOpen(t)}>
      <span className="tx-emoji" style={{ background: `color-mix(in srgb, ${cat.color} 22%, transparent)` }} aria-hidden>
        {cat.emoji}
      </span>
      <span className="tx-main">
        <strong>{t.category}</strong>
        <small>{t.note || TYPE_LABEL[t.type]}</small>
      </span>
      <span className="tx-amount" data-type={t.type}>
        {t.type === 'saving' ? money(t.amount) : signedMoney(sign * t.amount)}
      </span>
    </button>
  )
}

export function TxList({ items, grouped = true }: { items: Transaction[]; grouped?: boolean }) {
  const toast = useToast()
  const { refresh } = useTransactions()
  const { find } = useCategories()
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => {
    if (!grouped) return [{ day: '', rows: items }]
    const map = new Map<string, Transaction[]>()
    for (const t of items) map.set(t.occurred_on, [...(map.get(t.occurred_on) ?? []), t])
    return [...map.entries()].map(([day, rows]) => ({ day, rows }))
  }, [items, grouped])

  const remove = async () => {
    if (!selected) return
    if (!confirm) return setConfirm(true)
    setBusy(true)
    const { error } = await supabase.from('transactions').delete().eq('id', selected.id)
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    await refresh()
    toast('Əməliyyat silindi', 'success')
    setSelected(null)
    setConfirm(false)
  }

  const close = () => {
    setSelected(null)
    setConfirm(false)
  }

  return (
    <>
      {groups.map((g) => (
        <section key={g.day || 'all'} className="tx-group">
          {grouped && <h4 className="day">{dayLabel(g.day)}</h4>}
          <div className="card list">
            {g.rows.map((t) => (
              <Row key={t.id} t={t} onOpen={setSelected} />
            ))}
          </div>
        </section>
      ))}

      <Sheet open={!!selected} onClose={close} title="Əməliyyat">
        {selected && (
          <div className="detail" data-type={selected.type}>
            <div className="detail-top">
              <span className="tx-emoji big" style={{ background: `color-mix(in srgb, ${(find(selected.type, selected.category) ?? categoryFallback(selected.category)).color} 22%, transparent)` }} aria-hidden>
                {(find(selected.type, selected.category) ?? categoryFallback(selected.category)).emoji}
              </span>
              <div>
                <strong>{selected.category}</strong>
                <small>
                  {TYPE_LABEL[selected.type]} · {dayLabel(selected.occurred_on)}
                </small>
              </div>
            </div>
            <div className="detail-amount tx-amount" data-type={selected.type}>
              {money(selected.amount)}
            </div>
            {selected.note && <p className="detail-note">{selected.note}</p>}
            <div className="row-actions">
              <button
                className="btn btn-soft"
                onClick={() => {
                  setEditing(selected)
                  close()
                }}
              >
                <Icon name="edit" size={18} /> Redaktə et
              </button>
              <button className={`btn ${confirm ? 'btn-danger' : 'btn-soft'}`} disabled={busy} onClick={() => void remove()}>
                <Icon name="trash" size={18} /> {confirm ? 'Silməni təsdiqlə' : 'Sil'}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <AddTransactionSheet open={!!editing} editing={editing} onClose={() => setEditing(null)} />
    </>
  )
}
