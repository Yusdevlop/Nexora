import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { supabase } from '../lib/supabase'
import { GOAL_SUGGESTIONS } from '../lib/categories'
import { friendlyError, money, parseAmount, todayISO } from '../lib/format'
import type { Goal } from '../lib/types'
import type { GoalStats } from '../lib/groupMath'
import { useGroups } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'

interface SheetProps {
  open: boolean
  onClose: () => void
}

/* ------------------------------ Yeni qrup ------------------------------ */
export function CreateGroupSheet({ open, onClose }: SheetProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useGroups()
  const [name, setName] = useState('')
  const [goalName, setGoalName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setGoalName('')
      setTarget('')
      setDeadline('')
      setErr('')
      setBusy(false)
    }
  }, [open])

  const submit = async () => {
    const t = parseAmount(target)
    if (name.trim().length < 2) return setErr('Qrupun adını yazın.')
    if (t <= 0) return setErr('Hədəf məbləği yazın.')
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc('create_group', {
      p_name: name.trim(),
      p_goal_name: goalName.trim() || name.trim(),
      p_target: t,
      p_deadline: deadline || null
    })
    if (error) {
      setBusy(false)
      return setErr(friendlyError(error))
    }
    await refresh()
    toast('Qrup yaradıldı. İndi dostlarınızı dəvət edin!', 'success')
    onClose()
    navigate(`/groups/${data as string}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Yeni qrup">
      <div className="form">
        <label className="label">
          Qrupun adı
          <input className="field" autoFocus placeholder="Məs. Biznes Kapitalı" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="label">
          İlk məqsəd
          <div className="chips">
            {GOAL_SUGGESTIONS.map((g) => (
              <button key={g} type="button" className={`chip${goalName === g ? ' on' : ''}`} onClick={() => setGoalName(g)}>
                {g}
              </button>
            ))}
          </div>
          <input className="field" placeholder="Və ya öz adınızı yazın (boşdursa qrupun adı)" maxLength={80} value={goalName} onChange={(e) => setGoalName(e.target.value)} />
        </div>
        <label className="label">
          Hədəf məbləği (AZN)
          <input className="field" inputMode="decimal" placeholder="2000" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,\s]/g, ''))} />
        </label>
        <label className="label">
          Son tarix (istəyə bağlı)
          <input className="field" type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        {err && <p className="form-error" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Yaradılır…' : 'Qrup yarat'}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------------------------- Kodla qoşul ---------------------------- */
export function JoinGroupSheet({ open, onClose }: SheetProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useGroups()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setCode('')
      setErr('')
      setBusy(false)
    }
  }, [open])

  const submit = async () => {
    if (code.trim().length < 4) return setErr('Dəvət kodunu yazın.')
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc('join_group', { p_code: code.trim() })
    if (error) {
      setBusy(false)
      return setErr(friendlyError(error))
    }
    await refresh()
    toast('Qrupa qoşuldunuz', 'success')
    onClose()
    navigate(`/groups/${data as string}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Kodla qoşul">
      <div className="form">
        <label className="label">
          Dostunuzun göndərdiyi dəvət kodu
          <input
            className="field code-field"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="A1B2C3D4"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </label>
        {err && <p className="form-error" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Qoşulur…' : 'Qrupa qoşul'}
        </button>
      </div>
    </Sheet>
  )
}

/* ----------------------- Pul əlavə et / çıxar ----------------------- */
interface ContribProps extends SheetProps {
  groupId: string
  goals: GoalStats[]
  initialGoalId?: string
}

export function ContributionSheet({ open, onClose, groupId, goals, initialGoalId }: ContribProps) {
  const toast = useToast()
  const { user } = useAuth()
  const { refresh } = useGroups()
  const [goalId, setGoalId] = useState('')
  const [mode, setMode] = useState<'add' | 'take'>('add')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setGoalId(initialGoalId && goals.some((g) => g.goal.id === initialGoalId) ? initialGoalId : goals[0]?.goal.id ?? '')
      setMode('add')
      setAmount('')
      setNote('')
      setErr('')
      setBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialGoalId])

  const current = goals.find((g) => g.goal.id === goalId)
  const mine = current?.slices.find((s) => s.userId === user?.id)?.amount ?? 0

  const submit = async () => {
    const v = parseAmount(amount)
    if (!goalId) return setErr('Əvvəlcə məqsəd seçin.')
    if (v <= 0) return setErr('Məbləği yazın.')
    if (mode === 'take' && v > mine) return setErr(`Bu məqsəddən ən çox ${money(mine)} çıxara bilərsiniz (öz payınız).`)
    if (!navigator.onLine) return setErr('İnternet yoxdur. Bağlantı olanda yenidən cəhd edin.')
    setBusy(true)
    setErr('')
    const { error } = await supabase.from('group_contributions').insert({
      group_id: groupId,
      goal_id: goalId,
      amount: mode === 'add' ? v : -v,
      note: note.trim()
    })
    if (error) {
      setBusy(false)
      return setErr(friendlyError(error))
    }
    await refresh()
    toast(mode === 'add' ? `+${money(v)} əlavə olundu` : `${money(v)} çıxarıldı`, 'success')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'add' ? 'Qrupa pul əlavə et' : 'Qrupdan pul çıxar'}>
      <div className="form" data-type={mode === 'add' ? 'income' : 'expense'}>
        <div className="segmented two">
          <button className={mode === 'add' ? 'on' : ''} data-type="income" onClick={() => setMode('add')}>
            <Icon name="plus" size={18} /> Əlavə et
          </button>
          <button className={mode === 'take' ? 'on' : ''} data-type="expense" onClick={() => setMode('take')}>
            Çıxar
          </button>
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
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            aria-label="Məbləğ"
          />
          <span>AZN</span>
        </label>

        <div className="label">
          Məqsəd
          <div className="chips">
            {goals.map((g) => (
              <button key={g.goal.id} className={`chip${g.goal.id === goalId ? ' on' : ''}`} onClick={() => setGoalId(g.goal.id)}>
                {g.goal.name}
              </button>
            ))}
          </div>
          {mode === 'take' && current && <small className="muted">Sizin payınız: {money(mine)}</small>}
        </div>

        <input className="field" placeholder="Qeyd (istəyə bağlı)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="form-error" role="alert">{err}</p>}
        <button className="btn btn-accent" disabled={busy || goals.length === 0} onClick={() => void submit()}>
          {busy ? 'Saxlanılır…' : mode === 'add' ? 'Əlavə et' : 'Çıxar'}
        </button>
      </div>
    </Sheet>
  )
}

/* ------------------------------ Yeni məqsəd ------------------------------ */
export function GoalSheet({ open, onClose, groupId }: SheetProps & { groupId: string }) {
  const toast = useToast()
  const { refresh } = useGroups()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setTarget('')
      setDeadline('')
      setErr('')
      setBusy(false)
    }
  }, [open])

  const submit = async () => {
    const t = parseAmount(target)
    if (name.trim().length < 1) return setErr('Məqsədin adını yazın.')
    if (t <= 0) return setErr('Hədəf məbləği yazın.')
    setBusy(true)
    setErr('')
    const row: Partial<Goal> = { group_id: groupId, name: name.trim(), target_amount: t, deadline: deadline || null }
    const { error } = await supabase.from('group_goals').insert(row)
    if (error) {
      setBusy(false)
      return setErr(friendlyError(error))
    }
    await refresh()
    toast('Məqsəd əlavə olundu', 'success')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Yeni məqsəd">
      <div className="form">
        <div className="label">
          Məqsədin adı
          <div className="chips">
            {GOAL_SUGGESTIONS.map((g) => (
              <button key={g} type="button" className={`chip${name === g ? ' on' : ''}`} onClick={() => setName(g)}>
                {g}
              </button>
            ))}
          </div>
          <input className="field" autoFocus placeholder="Məs. Ofis" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="label">
          Hədəf məbləği (AZN)
          <input className="field" inputMode="decimal" placeholder="1500" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,\s]/g, ''))} />
        </label>
        <label className="label">
          Son tarix (istəyə bağlı)
          <input className="field" type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        {err && <p className="form-error" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Əlavə olunur…' : 'Məqsəd əlavə et'}
        </button>
      </div>
    </Sheet>
  )
}
