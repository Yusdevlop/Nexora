import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGroups } from '../context/DataContext'
import { AvatarStack, EmptyState, SplitBar } from '../components/Bits'
import { CreateGroupSheet, JoinGroupSheet } from '../components/GroupSheets'
import { Icon } from '../components/Icon'
import { groupStats, colorOf } from '../lib/groupMath'
import { deadlineInfo, money } from '../lib/format'

export default function Groups() {
  const { data, loading, error } = useGroups()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Qruplar</h1>
      </header>

      <div className="row-actions">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} /> Yeni qrup
        </button>
        <button className="btn btn-soft" onClick={() => setJoining(true)}>
          <Icon name="key" size={18} /> Kodla qoşul
        </button>
      </div>

      {error && !data.groups.length && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="card skeleton tall" />
      ) : data.groups.length === 0 ? (
        <EmptyState emoji="🤝" title="Hələ qrupunuz yoxdur" text="Qrup yaradın, dostunuza kodu göndərin — hər kəsin əlavə etdiyi pul hamıda anında görünəcək." />
      ) : (
        <div className="stack">
          {data.groups.map((g) => {
            const s = groupStats(g.id, data)
            const members = data.members.filter((m) => m.group_id === g.id)
            const next = s.goals
              .map((x) => x.goal.deadline)
              .filter((d): d is string => !!d)
              .sort()[0]
            const dl = deadlineInfo(next ?? null)
            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="card group-card">
                <div className="row-between">
                  <div>
                    <strong className="group-name">{g.name}</strong>
                    <small className="muted">
                      {members.length} üzv · {s.goals.length} məqsəd
                    </small>
                  </div>
                  <AvatarStack slices={members.map((m) => ({ name: m.name, color: colorOf(members, m.user_id) }))} />
                </div>
                <div className="group-total">
                  {money(s.total)} <span className="muted">/ {s.target ? money(s.target) : '—'}</span>
                </div>
                <SplitBar slices={s.slices} target={s.target} />
                <div className="row-between small muted">
                  <span>{Math.round(Math.min(100, s.pct))}% tamamlanıb</span>
                  {dl && <span className={`tone-${dl.tone}`}>{dl.text}</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
      <JoinGroupSheet open={joining} onClose={() => setJoining(false)} />
    </div>
  )
}
