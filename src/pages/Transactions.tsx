import { useMemo, useState } from 'react'
import { useTransactions } from '../context/DataContext'
import { useAdd } from '../context/AddContext'
import { TxList } from '../components/TxList'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/Bits'
import { currentMonthKey, monthKey, monthTitle, shiftMonth, money } from '../lib/format'
import { totalsOf } from '../lib/stats'
import { TYPE_LABEL } from '../lib/categories'
import { downloadCSV, openPrintableStatement } from '../lib/export'
import { useToast } from '../components/Toast'
import type { TxType } from '../lib/types'

type Filter = 'all' | TxType
const FILTERS: Filter[] = ['all', 'income', 'expense', 'saving']

export default function Transactions() {
  const { items, loading } = useTransactions()
  const openAdd = useAdd()
  const toast = useToast()
  const [month, setMonth] = useState(currentMonthKey())
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  const inMonth = useMemo(() => items.filter((t) => monthKey(t.occurred_on) === month), [items, month])
  const totals = useMemo(() => totalsOf(inMonth), [inMonth])
  const filtered = useMemo(() => (filter === 'all' ? inMonth : inMonth.filter((t) => t.type === filter)), [inMonth, filter])
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('az')
    if (!q) return filtered
    return filtered.filter((t) => t.category.toLocaleLowerCase('az').includes(q) || t.note.toLocaleLowerCase('az').includes(q))
  }, [filtered, query])
  const isCurrent = month === currentMonthKey()

  const doExport = (kind: 'csv' | 'print') => {
    setExportOpen(false)
    if (shown.length === 0) return toast('İxrac ediləcək əməliyyat yoxdur', 'info')
    const title = `${monthTitle(month)}${filter !== 'all' ? ` · ${TYPE_LABEL[filter]}` : ''}`
    if (kind === 'csv') downloadCSV(shown, `kapital-${month}`)
    else if (!openPrintableStatement(shown, title)) toast('Pəncərə brauzer tərəfindən bloklandı, yenidən cəhd edin', 'error')
  }

  return (
    <div className="page">
      <header className="page-head row-between">
        <h1>Əməliyyatlar</h1>
        <span style={{ position: 'relative' }}>
          <button className="icon-btn filled" aria-label="İxrac et" onClick={() => setExportOpen((v) => !v)}>
            <Icon name="download" size={20} />
          </button>
          {exportOpen && (
            <div className="export-menu">
              <button onClick={() => doExport('csv')}>
                <Icon name="download" size={16} /> CSV (Excel)
              </button>
              <button onClick={() => doExport('print')}>
                <Icon name="printer" size={16} /> Çap / PDF
              </button>
            </div>
          )}
        </span>
      </header>

      <label className="search-field">
        <Icon name="search" size={18} />
        <input placeholder="Kateqoriya və ya qeyddə axtar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button className="icon-btn" aria-label="Təmizlə" onClick={() => setQuery('')}>
            <Icon name="x" size={16} />
          </button>
        )}
      </label>

      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Əvvəlki ay">
          <Icon name="back" />
        </button>
        <strong>{monthTitle(month)}</strong>
        <button className="icon-btn" disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Növbəti ay">
          <Icon name="next" />
        </button>
      </div>

      <div className="summary">
        {(['income', 'expense', 'saving'] as TxType[]).map((t) => (
          <div key={t} data-type={t}>
            <small>{TYPE_LABEL[t]}</small>
            <b>{money(totals[t])}</b>
          </div>
        ))}
      </div>

      <div className="chips scroll" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Hamısı' : TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card skeleton" />
      ) : shown.length === 0 ? (
        <EmptyState emoji={query ? '🔎' : '🗓️'} title={query ? 'Nəticə tapılmadı' : 'Bu dövrdə əməliyyat yoxdur'} text={query ? 'Başqa söz yazıb yenidən yoxlayın.' : isCurrent ? 'Yeni əməliyyat əlavə edin.' : 'Başqa ay seçin.'}>
          {isCurrent && !query && (
            <button className="btn btn-primary small" onClick={() => openAdd()}>
              Əlavə et
            </button>
          )}
        </EmptyState>
      ) : (
        <TxList items={shown} />
      )}
    </div>
  )
}
