import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useCloud, type ChangePayload } from '../lib/useCloud'
import { signedMoney } from '../lib/format'
import type { Contribution, Goal, Group, GroupsData, Member, Transaction } from '../lib/types'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

/* ------------------------------------------------------------------ */
/*  Şəxsi əməliyyatlar                                                  */
/* ------------------------------------------------------------------ */
interface TxValue {
  items: Transaction[]
  loading: boolean
  error: string | null
  live: boolean
  refresh: () => Promise<void>
}
const TxCtx = createContext<TxValue | null>(null)
export const useTransactions = () => {
  const v = useContext(TxCtx)
  if (!v) throw new Error('TransactionsProvider yoxdur')
  return v
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const fetcher = useCallback(async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id,user_id,type,amount,category,note,occurred_on,created_at')
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Transaction[]
  }, [])

  const { data, loading, error, live, refresh } = useCloud<Transaction[]>({
    userId: user?.id,
    key: 'transactions',
    fetcher,
    tables: ['transactions']
  })

  const value = useMemo<TxValue>(
    () => ({ items: data ?? [], loading: loading && !data, error, live, refresh }),
    [data, loading, error, live, refresh]
  )
  return <TxCtx.Provider value={value}>{children}</TxCtx.Provider>
}

/* ------------------------------------------------------------------ */
/*  Qruplar (qruplar + üzvlər + məqsədlər + əlavələr — hamısı real-time) */
/* ------------------------------------------------------------------ */
const EMPTY: GroupsData = { groups: [], members: [], goals: [], contributions: [] }

interface GroupsValue {
  data: GroupsData
  loading: boolean
  error: string | null
  live: boolean
  refresh: () => Promise<void>
}
const GroupsCtx = createContext<GroupsValue | null>(null)
export const useGroups = () => {
  const v = useContext(GroupsCtx)
  if (!v) throw new Error('GroupsProvider yoxdur')
  return v
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()

  const fetcher = useCallback(async (): Promise<GroupsData> => {
    const [g, m, go, c] = await Promise.all([
      supabase.from('groups').select('*').order('created_at', { ascending: true }),
      supabase.from('group_members').select('group_id,user_id,role,joined_at,profiles(display_name)'),
      supabase.from('group_goals').select('*').order('created_at', { ascending: true }),
      supabase
        .from('group_contributions')
        .select('id,group_id,goal_id,user_id,amount,note,created_at,profiles(display_name)')
        .order('created_at', { ascending: false })
        .limit(5000)
    ])
    for (const r of [g, m, go, c]) if (r.error) throw r.error

    const members: Member[] = (m.data ?? []).map((r: any) => ({
      group_id: r.group_id,
      user_id: r.user_id,
      role: r.role,
      joined_at: r.joined_at,
      name: r.profiles?.display_name || 'Üzv'
    }))
    const contributions: Contribution[] = (c.data ?? []).map((r: any) => ({
      id: r.id,
      group_id: r.group_id,
      goal_id: r.goal_id,
      user_id: r.user_id,
      amount: Number(r.amount),
      note: r.note ?? '',
      created_at: r.created_at,
      name: r.profiles?.display_name || 'Keçmiş üzv'
    }))
    const goals: Goal[] = (go.data ?? []).map((r: any) => ({ ...r, target_amount: Number(r.target_amount) }))
    return { groups: (g.data ?? []) as Group[], members, goals, contributions }
  }, [])

  // real-time bildirişi üçün ən son vəziyyəti ref-də saxlayırıq
  const latest = useRef<GroupsData>(EMPTY)

  const onChange = useCallback(
    (table: string, payload: ChangePayload) => {
      if (table !== 'group_contributions' || payload.eventType !== 'INSERT') return
      const row = payload.new as { user_id?: string; group_id?: string; amount?: number | string }
      if (!row.user_id || row.user_id === user?.id) return
      const amount = Number(row.amount)
      const who = latest.current.members.find((mm) => mm.user_id === row.user_id)?.name ?? 'Üzv'
      const group = latest.current.groups.find((gg) => gg.id === row.group_id)?.name
      toast(`${who} ${signedMoney(amount)} ${amount > 0 ? 'əlavə etdi' : 'çıxardı'}${group ? ` · ${group}` : ''}`, 'live')
    },
    [toast, user?.id]
  )

  const { data, loading, error, live, refresh } = useCloud<GroupsData>({
    userId: user?.id,
    key: 'groups',
    fetcher,
    tables: ['groups', 'group_members', 'group_goals', 'group_contributions'],
    onChange
  })

  useEffect(() => {
    if (data) latest.current = data
  }, [data])

  const value = useMemo<GroupsValue>(
    () => ({ data: data ?? EMPTY, loading: loading && !data, error, live, refresh }),
    [data, loading, error, live, refresh]
  )
  return <GroupsCtx.Provider value={value}>{children}</GroupsCtx.Provider>
}
