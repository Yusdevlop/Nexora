import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useCloud } from '../lib/useCloud'
import { friendlyError, currentMonthKey, todayISO } from '../lib/format'
import type { Recurring, TxType } from '../lib/types'
import { useAuth } from './AuthContext'

interface RecurringValue {
  items: Recurring[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  add: (r: { type: TxType; amount: number; category: string; note: string; day_of_month: number }) => Promise<void>
  update: (id: string, patch: Partial<Pick<Recurring, 'amount' | 'category' | 'note' | 'day_of_month' | 'active'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

const Ctx = createContext<RecurringValue | null>(null)
export const useRecurring = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('RecurringProvider yoxdur')
  return v
}

export function RecurringProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const fetcher = useCallback(async (): Promise<Recurring[]> => {
    const { data, error } = await supabase.from('recurring').select('*').order('day_of_month', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: Recurring) => ({ ...r, amount: Number(r.amount) })) as Recurring[]
  }, [])

  const { data, loading, error, refresh } = useCloud<Recurring[]>({ userId: user?.id, key: 'recurring', fetcher, tables: ['recurring'] })
  const items = data ?? []

  // Bu ay üçün hələ yaradılmamış, vaxtı çatmış təkrarlanan əməliyyatları avtomatik əlavə edir.
  const ran = useRef(false)
  useEffect(() => {
    if (!user?.id || !data || ran.current) return
    const day = new Date().getDate()
    const key = currentMonthKey()
    const due = data.filter((r) => r.active && r.day_of_month <= day && r.last_run !== key)
    if (due.length === 0) {
      ran.current = true
      return
    }
    ran.current = true
    void (async () => {
      for (const r of due) {
        const occurred_on = `${key}-${String(r.day_of_month).padStart(2, '0')}`
        const { error: txErr } = await supabase.from('transactions').insert({
          type: r.type,
          amount: r.amount,
          category: r.category,
          note: r.note || 'Avtomatik (təkrarlanan)',
          occurred_on: occurred_on <= todayISO() ? occurred_on : todayISO()
        })
        if (!txErr) await supabase.from('recurring').update({ last_run: key }).eq('id', r.id)
      }
      await refresh()
    })()
  }, [user?.id, data, refresh])

  const add = useCallback(
    async (r: { type: TxType; amount: number; category: string; note: string; day_of_month: number }) => {
      const { error } = await supabase.from('recurring').insert(r)
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [refresh]
  )

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Recurring, 'amount' | 'category' | 'note' | 'day_of_month' | 'active'>>) => {
      const { error } = await supabase.from('recurring').update(patch).eq('id', id)
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('recurring').delete().eq('id', id)
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [refresh]
  )

  const value: RecurringValue = { items, loading: loading && !data, error, refresh, add, update, remove }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
