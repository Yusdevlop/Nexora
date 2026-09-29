import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../context/DataContext'
import { useCategories } from '../context/CategoriesContext'
import { Icon } from '../components/Icon'
import { MonthlyBars, EmptyState } from '../components/Bits'
import { Donut } from '../components/Donut'
import { categoryBreakdown, rangeBars, totalsInRange, RANGE_LABEL, RANGES, type RangeKey } from '../lib/stats'
import { computeInsights } from '../lib/insights'
import { money } from '../lib/format'
import { TYPE_LABEL } from '../lib/categories'
import type { TxType } from '../lib/types'

const DONUT_TYPES: TxType[] = ['expense', 'income', 'saving']

export default function Analysis() {
  const navigate = useNavigate()
  const { items, loading } = useTransactions()
  const { find, all: categories } = useCategories()
  const [range, setRange] = useState<RangeKey>('month')
  const [donutType, setDonutType] = useState<TxType>('expense')

  const bars = useMemo(() => rangeBars(items, range), [items, range])
  const totals = useMemo(() => totalsInRange(items, range), [items, range])
  const cats = useMemo(() => categoryBreakdown(items, donutType, range, (t, n) => find(t, n) ?? { emoji: '🧾', color: '#93A1BB' }), [items, donutType, range, find])
  const insights = useMemo(() => computeInsights(items, categories), [items, categories])

  if (loading) return <div className="page"><div className="card skeleton tall" /></div>

  return (
    <div className="page">
      <header className="page-head-row">
        <button className="icon-btn filled" onClick={() => navigate(-1)} aria-label="Geri">
          <Icon name="back" />
        </button>
        <h1>Analiz</h1>
      </header>

      {items.length === 0 ? (
        <EmptyState emoji="📊" title="Hələ məlumat yoxdur" text="Bir neçə əməliyyat əlavə edin, analiz burada görünəcək." />
      ) : (
        <>
          <div className="chips scroll" role="tablist">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={range === r} className={`chip${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          <section>
            <div className="section-head">
              <h2>Trend</h2>
              <span className="legend">
                <i className="dot income" /> Gəlir <i className="dot expense" /> Xərc
              </span>
            </div>
            <div className="card">
              <MonthlyBars data={bars} />
            </div>
            <div className="summary" style={{ marginTop: 10 }}>
              {(['income', 'expense', 'saving'] as TxType[]).map((t) => (
                <div key={t} data-type={t}>
                  <small>{TYPE_LABEL[t]}</small>
                  <b>{money(totals[t])}</b>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2>Kateqoriya paylanması</h2>
            </div>
            <div className="segmented" role="tablist" style={{ marginBottom: 12 }}>
              {DONUT_TYPES.map((t) => (
                <button key={t} role="tab" aria-selected={donutType === t} className={donutType === t ? 'on' : ''} data-type={t} onClick={() => setDonutType(t)}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="card">
              <Donut slices={cats} total={totals[donutType]} centerLabel={RANGE_LABEL[range].toLowerCase()} />
            </div>
          </section>

          {insights.length > 0 && (
            <section>
              <div className="section-head">
                <h2>Tövsiyələr</h2>
              </div>
              <div className="stack">
                {insights.map((ins, i) => (
                  <div key={i} className={`card insight insight-${ins.tone}`}>
                    <span aria-hidden>{ins.emoji}</span>
                    <p>{ins.text}</p>
                  </div>
                ))}
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                Bu tövsiyələr sizin öz rəqəmləriniz üzərində sadə hesablamalarla yaradılır, maliyyə məsləhəti deyil.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
