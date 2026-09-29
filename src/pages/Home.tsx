import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTransactions, useGroups } from '../context/DataContext'
import { useAdd } from '../context/AddContext'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Icon } from '../components/Icon'
import { SplitBar, EmptyState } from '../components/Bits'
import { TxList } from '../components/TxList'
import { balanceOf, categoryBreakdown, totalsOf } from '../lib/stats'
import { currentMonthKey, monthKey, money, num } from '../lib/format'
import { TYPE_LABEL } from '../lib/categories'
import { useCategories } from '../context/CategoriesContext'
import { groupStats } from '../lib/groupMath'
import { useInstall } from '../lib/pwa'
import type { TxType } from '../lib/types'

const QUICK: TxType[] = ['income', 'expense', 'saving']

export default function Home() {
  const { displayName } = useAuth()
  const { items, loading, error } = useTransactions()
  const { data: gdata } = useGroups()
  const openAdd = useAdd()
  const { canInstall, install } = useInstall()
  const { find } = useCategories()

  const month = currentMonthKey()
  const all = useMemo(() => totalsOf(items), [items])
  const thisMonth = useMemo(() => totalsOf(items, (t) => monthKey(t.occurred_on) === month), [items, month])
  const topCat = useMemo(() => categoryBreakdown(items, 'expense', 'month', (t, n) => find(t, n) ?? { emoji: '🧾', color: '#93A1BB' })[0], [items, find])
  const balance = balanceOf(all)
  const first = displayName.split(' ')[0]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="hello">Salam{first ? `, ${first}` : ''}</p>
          <h1>Maliyyə vəziyyətin</h1>
        </div>
      </header>

      {error && !items.length && <p className="form-error">{error}</p>}

      <section className="hero" aria-label="Cari balans">
        <div className="hero-glow g1" />
        <div className="hero-glow g2" />
        <p className="hero-label">Cari balans</p>
        <p className="hero-amount">
          <AnimatedNumber value={balance} format={num} />
          <span> AZN</span>
        </p>
        <p className="hero-sub">
          Ümumi yığım: <b>{money(all.saving)}</b>
        </p>
        <div className="hero-pills">
          {QUICK.map((t) => (
            <div key={t} className="pill" data-type={t}>
              <Icon name={t} size={16} />
              <span>
                <b>{money(thisMonth[t])}</b>
                <small>Bu ay {TYPE_LABEL[t].toLowerCase()}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="quick" aria-label="Sürətli əlavə">
        {QUICK.map((t) => (
          <button key={t} className="quick-btn" data-type={t} onClick={() => openAdd(t)}>
            <span className="quick-ico">
              <Icon name="plus" size={20} />
            </span>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </section>

      {canInstall && (
        <button className="install-banner" onClick={() => void install()}>
          <Icon name="download" size={20} />
          <span>
            <b>Tətbiqi telefona quraşdır</b>
            <small>Ana ekrandan bir toxunuşla aç</small>
          </span>
        </button>
      )}

      <section>
        <div className="section-head">
          <h2>Qruplarım</h2>
          <Link to="/groups">Hamısı</Link>
        </div>
        {gdata.groups.length === 0 ? (
          <Link to="/groups" className="card invite-card">
            <span className="invite-emoji" aria-hidden>
              🤝
            </span>
            <span>
              <b>Dostlarla birgə yığın</b>
              <small>Qrup yaradın və ya dostunuzun kodu ilə qoşulun</small>
            </span>
            <Icon name="next" size={20} />
          </Link>
        ) : (
          <div className="stack">
            {gdata.groups.slice(0, 2).map((g) => {
              const s = groupStats(g.id, gdata)
              return (
                <Link key={g.id} to={`/groups/${g.id}`} className="card group-mini">
                  <div className="row-between">
                    <strong>{g.name}</strong>
                    <span className="muted">{Math.round(Math.min(100, s.pct))}%</span>
                  </div>
                  <SplitBar slices={s.slices} target={s.target} />
                  <div className="row-between muted small">
                    <span>{money(s.total)}</span>
                    <span>{s.target ? `hədəf ${money(s.target)}` : 'məqsəd əlavə edin'}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Son əməliyyatlar</h2>
          {items.length > 0 && <Link to="/transactions">Hamısı</Link>}
        </div>
        {loading ? (
          <div className="card skeleton" />
        ) : items.length === 0 ? (
          <EmptyState emoji="🌱" title="Hələ əməliyyat yoxdur" text="İlk gəlirinizi və ya xərcinizi əlavə edin — bir neçə toxunuş kifayətdir.">
            <button className="btn btn-primary small" onClick={() => openAdd('expense')}>
              Əməliyyat əlavə et
            </button>
          </EmptyState>
        ) : (
          <TxList items={items.slice(0, 5)} grouped={false} />
        )}
      </section>

      {items.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Analiz</h2>
          </div>
          <Link to="/analysis" className="card analysis-teaser">
            <span className="analysis-teaser-ico" aria-hidden>
              📊
            </span>
            <span>
              <b>{topCat ? `Bu ay ən çox ${topCat.name}-a gedib` : 'Xərclərinizin qrafikinə baxın'}</b>
              <small>{topCat ? `${money(topCat.amount)} · ${Math.round(topCat.pct)}%` : 'Kateqoriyalar, trend və tövsiyələr'}</small>
            </span>
            <Icon name="next" size={20} />
          </Link>
        </section>
      )}
    </div>
  )
}
