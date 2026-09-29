import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useGroups } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useOnline } from '../lib/pwa'
import { CLAUDE_MODE } from '../lib/mode'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Avatar, EmptyState, SplitBar } from '../components/Bits'
import { ContributionSheet, GoalSheet } from '../components/GroupSheets'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { supabase } from '../lib/supabase'
import { colorOf } from '../lib/groupMath'
import { groupStats } from '../lib/groupMath'
import { dateKeyOfTs, dayLabel, deadlineInfo, friendlyError, money, signedMoney, timeOf } from '../lib/format'

type Tab = 'goals' | 'members' | 'history'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, live, refresh } = useGroups()
  const online = useOnline()

  const [tab, setTab] = useState<Tab>('goals')
  const [contrib, setContrib] = useState<{ open: boolean; goalId?: string }>({ open: false })
  const [addingGoal, setAddingGoal] = useState(false)
  const [menu, setMenu] = useState(false)
  const [openGoal, setOpenGoal] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const group = data.groups.find((g) => g.id === id)
  const members = useMemo(() => data.members.filter((m) => m.group_id === id), [data.members, id])
  const stats = useMemo(() => (group ? groupStats(group.id, data) : null), [group, data])
  const history = useMemo(() => {
    const goalName = new Map(data.goals.map((g) => [g.id, g.name]))
    const map = new Map<string, { day: string; rows: { c: (typeof data.contributions)[number]; goal: string }[] }>()
    for (const c of data.contributions) {
      if (c.group_id !== id) continue
      const day = dateKeyOfTs(c.created_at)
      const bucket = map.get(day) ?? { day, rows: [] }
      bucket.rows.push({ c, goal: goalName.get(c.goal_id) ?? '' })
      map.set(day, bucket)
    }
    return [...map.values()]
  }, [data, id])

  if (loading) return <div className="page"><div className="card skeleton tall" /></div>
  if (!group || !stats) {
    return (
      <div className="page">
        <EmptyState emoji="🔍" title="Qrup tapılmadı" text="Qrup silinib və ya siz artıq üzv deyilsiniz.">
          <Link className="btn btn-primary small" to="/groups">
            Qruplara qayıt
          </Link>
        </EmptyState>
      </div>
    )
  }

  const me = members.find((m) => m.user_id === user?.id)
  const isOwner = me?.role === 'owner'
  const inviteUrl = `${window.location.origin}/join/${group.invite_code}`

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Kopyalandı', 'success')
      return
    } catch {
      /* iframe-də clipboard bloklana bilər — köhnə üsulla cəhd */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      toast(ok ? 'Kopyalandı' : 'Kodu əl ilə kopyalayın', ok ? 'success' : 'info')
    } catch {
      toast('Kodu əl ilə kopyalayın', 'info')
    }
  }
  const share = async () => {
    const text = `“${group.name}” qrupuna qoşul. Kapital tətbiqində “Kodla qoşul” bölməsinə bu kodu yaz: ${group.invite_code}`
    if (navigator.share) {
      try {
        await navigator.share(CLAUDE_MODE ? { title: 'Kapital', text } : { title: 'Kapital', text, url: inviteUrl })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    await copy(CLAUDE_MODE ? text : `${text}\n${inviteUrl}`)
  }

  const run = async (action: () => PromiseLike<{ error: unknown }>, okText: string) => {
    const { error } = await action()
    if (error) {
      toast(friendlyError(error), 'error')
      return false
    }
    await refresh()
    toast(okText, 'success')
    return true
  }

  const removeContribution = async (cid: string) => {
    if (confirm !== cid) return setConfirm(cid)
    setConfirm(null)
    await run(() => supabase.from('group_contributions').delete().eq('id', cid), 'Əlavə silindi')
  }

  const removeGoal = async (gid: string) => {
    if (confirm !== gid) return setConfirm(gid)
    setConfirm(null)
    await run(() => supabase.from('group_goals').delete().eq('id', gid), 'Məqsəd silindi')
  }

  const leaveOrDelete = async () => {
    if (confirm !== 'leave') return setConfirm('leave')
    setConfirm(null)
    const ok = isOwner
      ? await run(() => supabase.from('groups').delete().eq('id', group.id), 'Qrup silindi')
      : await run(() => supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', user!.id), 'Qrupdan çıxdınız')
    if (ok) {
      setMenu(false)
      navigate('/groups', { replace: true })
    }
  }

  return (
    <div className="page">
      <section className="hero group-hero" aria-label={group.name}>
        <div className="hero-glow g1" />
        <div className="hero-glow g2" />
        <div className="gh-top">
          <button className="icon-btn on-dark" onClick={() => navigate('/groups')} aria-label="Geri">
            <Icon name="back" />
          </button>
          <span className={`live-chip${live ? ' on' : ''}`}>
            <i className="live-dot" /> {live ? 'Canlı' : online ? 'Qoşulur…' : 'Oflayn'}
          </span>
          <button className="icon-btn on-dark" onClick={() => setMenu(true)} aria-label="Qrup menyusu">
            <Icon name="more" />
          </button>
        </div>
        <p className="hero-label">{group.name}</p>
        <p className="hero-amount">
          <AnimatedNumber value={stats.total} format={money} />
        </p>
        <p className="hero-sub">
          {stats.target > 0 ? (
            <>
              hədəf <b>{money(stats.target)}</b> · qalıb <b>{money(stats.remaining)}</b> · {Math.round(Math.max(0, stats.pct))}%
            </>
          ) : (
            'Hədəf təyin etmək üçün məqsəd əlavə edin'
          )}
        </p>
        <SplitBar slices={stats.slices} target={stats.target} thick />
        <div className="legend-row">
          {stats.slices.map((s) => (
            <span key={s.userId} className="legend-item">
              <i className="dot" style={{ background: s.color }} />
              {s.name.split(' ')[0]} <b>{money(s.amount)}</b>
            </span>
          ))}
        </div>
        <button className="btn btn-accent" disabled={stats.goals.length === 0} onClick={() => setContrib({ open: true })}>
          <Icon name="plus" size={20} /> Pul əlavə et
        </button>
      </section>

      <div className="tabs" role="tablist">
        {(
          [
            ['goals', 'Məqsədlər'],
            ['members', 'Üzvlər'],
            ['history', 'Tarixçə']
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'goals' && (
        <div className="stack">
          {stats.goals.length === 0 && <EmptyState emoji="🎯" title="Hələ məqsəd yoxdur" text="Məsələn: Biznes, Ofis, Türkiyə, Avadanlıq." />}
          {stats.goals.map((g) => {
            const dl = deadlineInfo(g.goal.deadline)
            const expanded = openGoal === g.goal.id
            const canDelete = isOwner || g.goal.created_by === user?.id
            return (
              <article key={g.goal.id} className="card goal">
                <div className="row-between">
                  <strong>{g.goal.name}</strong>
                  <span className={`badge${g.pct >= 100 ? ' done' : ''}`}>{g.pct >= 100 ? 'Tamamlandı 🎉' : `${Math.round(Math.max(0, g.pct))}%`}</span>
                </div>
                <div className="goal-nums">
                  <b>{money(g.current)}</b>
                  <span className="muted"> / {money(g.goal.target_amount)}</span>
                </div>
                <SplitBar slices={g.slices} target={g.goal.target_amount} />
                <div className="row-between small muted">
                  <span>Qalıb: {money(g.remaining)}</span>
                  {dl && <span className={`tone-${dl.tone}`}>{dl.text}</span>}
                </div>
                <div className="row-actions tight">
                  <button className="btn btn-soft small" onClick={() => setContrib({ open: true, goalId: g.goal.id })}>
                    <Icon name="plus" size={16} /> Əlavə et
                  </button>
                  <button className="btn btn-ghost small" aria-expanded={expanded} onClick={() => setOpenGoal(expanded ? null : g.goal.id)}>
                    Üzvlərin payı
                  </button>
                </div>
                {expanded && (
                  <div className="goal-detail">
                    {g.slices.map((s) => (
                      <div key={s.userId} className="member-line">
                        <Avatar name={s.name} color={s.color} size={28} />
                        <span>{s.userId === user?.id ? `${s.name} (sən)` : s.name}</span>
                        <b>{money(s.amount)}</b>
                      </div>
                    ))}
                    {canDelete && (
                      <button className={`btn small ${confirm === g.goal.id ? 'btn-danger' : 'btn-ghost'}`} onClick={() => void removeGoal(g.goal.id)}>
                        <Icon name="trash" size={16} /> {confirm === g.goal.id ? 'Məqsəd və əlavələri silinsin?' : 'Məqsədi sil'}
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
          <button className="btn btn-soft" onClick={() => setAddingGoal(true)}>
            <Icon name="flag" size={18} /> Yeni məqsəd
          </button>
        </div>
      )}

      {tab === 'members' && (
        <div className="stack">
          <div className="card invite">
            <div>
              <small className="muted">Dəvət kodu</small>
              <div className="code">{group.invite_code}</div>
            </div>
            <div className="row-actions tight">
              <button className="icon-btn filled" onClick={() => void copy(group.invite_code)} aria-label="Kodu kopyala">
                <Icon name="copy" size={20} />
              </button>
              <button className="icon-btn filled" onClick={() => void share()} aria-label="Paylaş">
                <Icon name="share" size={20} />
              </button>
            </div>
          </div>
          <div className="card list">
            {members.map((m) => {
              const slice = stats.slices.find((s) => s.userId === m.user_id)
              const share = stats.total > 0 && slice ? Math.round((Math.max(0, slice.amount) / stats.total) * 100) : 0
              return (
                <div key={m.user_id} className="member-row">
                  <Avatar name={m.name} color={colorOf(members, m.user_id)} />
                  <span className="member-main">
                    <strong>
                      {m.name}
                      {m.user_id === user?.id && <em> (sən)</em>}
                    </strong>
                    <small>{m.role === 'owner' ? 'Qrupun sahibi' : 'Üzv'}</small>
                  </span>
                  <span className="member-amount">
                    <b>{money(slice?.amount ?? 0)}</b>
                    <small>{share}%</small>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 && <EmptyState emoji="🧾" title="Tarixçə boşdur" text="Qrupa ilk pulu əlavə etdikdən sonra bütün əməliyyatlar burada görünəcək." />}
          {history.map((h) => (
            <section key={h.day} className="tx-group">
              <h4 className="day">{dayLabel(h.day)}</h4>
              <div className="card list">
                {h.rows.map(({ c, goal }) => {
                  const mine = c.user_id === user?.id
                  return (
                    <div key={c.id} className="hist">
                      <Avatar name={c.name} color={colorOf(members, c.user_id)} size={36} />
                      <span className="hist-main">
                        <strong>
                          {mine ? 'Sən' : c.name.split(' ')[0]} <span className={c.amount > 0 ? 'pos' : 'neg'}>{signedMoney(c.amount)}</span> {c.amount > 0 ? 'əlavə etdi' : 'çıxardı'}
                        </strong>
                        <small>
                          {goal} · {timeOf(c.created_at)}
                          {c.note ? ` · ${c.note}` : ''}
                        </small>
                      </span>
                      {mine && (
                        <button className={`icon-btn${confirm === c.id ? ' danger' : ''}`} onClick={() => void removeContribution(c.id)} aria-label="Sil">
                          {confirm === c.id ? <span className="confirm-text">Sil?</span> : <Icon name="trash" size={18} />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <ContributionSheet open={contrib.open} onClose={() => setContrib({ open: false })} groupId={group.id} goals={stats.goals} initialGoalId={contrib.goalId} />
      <GoalSheet open={addingGoal} onClose={() => setAddingGoal(false)} groupId={group.id} />

      <Sheet open={menu} onClose={() => { setMenu(false); setConfirm(null) }} title={group.name}>
        <div className="form">
          <div className="card invite flat">
            <div>
              <small className="muted">Dəvət kodu</small>
              <div className="code">{group.invite_code}</div>
            </div>
            <div className="row-actions tight">
              <button className="icon-btn filled" onClick={() => void copy(CLAUDE_MODE ? group.invite_code : inviteUrl)} aria-label="Kopyala">
                <Icon name="copy" size={20} />
              </button>
              <button className="icon-btn filled" onClick={() => void share()} aria-label="Paylaş">
                <Icon name="share" size={20} />
              </button>
            </div>
          </div>
          <p className="muted small">{CLAUDE_MODE ? 'Dostunuz bu səhifəni claude.ai-da açıb “Kodla qoşul” bölməsinə bu kodu yazmalıdır.' : 'Dostunuz tətbiqdə “Kodla qoşul” bölməsinə bu kodu yazmalı və ya paylaşılan linkə toxunmalıdır.'}</p>
          <button className={`btn ${confirm === 'leave' ? 'btn-danger' : 'btn-soft'}`} onClick={() => void leaveOrDelete()}>
            <Icon name={isOwner ? 'trash' : 'logout'} size={18} />
            {confirm === 'leave' ? 'Bəli, təsdiq edirəm' : isOwner ? 'Qrupu sil' : 'Qrupdan çıx'}
          </button>
          {isOwner && confirm === 'leave' && <p className="form-error">Qrup, bütün məqsədlər və tarixçə hamı üçün həmişəlik silinəcək.</p>}
        </div>
      </Sheet>
    </div>
  )
}
