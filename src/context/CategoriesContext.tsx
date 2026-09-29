import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useCloud } from '../lib/useCloud'
import { friendlyError } from '../lib/format'
import type { Category, TxType } from '../lib/types'
import { useAuth } from './AuthContext'

interface CategoriesValue {
  all: Category[]
  byType: Record<TxType, Category[]>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  find: (type: TxType, name: string) => Category | undefined
  add: (type: TxType, name: string, emoji: string, color: string, monthlyLimit: number | null) => Promise<void>
  update: (id: string, patch: { name?: string; emoji?: string; color?: string; monthly_limit?: number | null }) => Promise<void>
  remove: (id: string) => Promise<void>
}

const FALLBACK: Category = { id: '', user_id: '', type: 'expense', name: 'Digər', emoji: '🧾', color: '#93A1BB', sort_order: 99, monthly_limit: null }

const Ctx = createContext<CategoriesValue | null>(null)
export const useCategories = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('CategoriesProvider yoxdur')
  return v
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const fetcher = useCallback(async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as Category[]
  }, [])

  const { data, loading, error, refresh } = useCloud<Category[]>({
    userId: user?.id,
    key: 'categories',
    fetcher,
    tables: ['categories']
  })

  const all = data ?? []

  const byType = useMemo<Record<TxType, Category[]>>(() => {
    const out: Record<TxType, Category[]> = { income: [], expense: [], saving: [] }
    for (const c of all) out[c.type].push(c)
    return out
  }, [all])

  const find = useCallback((type: TxType, name: string) => all.find((c) => c.type === type && c.name === name), [all])

  const add = useCallback(
    async (type: TxType, name: string, emoji: string, color: string, monthlyLimit: number | null) => {
      const clean = name.trim()
      if (!clean) throw new Error('Kateqoriyanın adını yazın.')
      if (byType[type].some((c) => c.name.toLowerCase() === clean.toLowerCase())) throw new Error('Bu adda kateqoriya artıq var.')
      const sort_order = Math.max(0, ...byType[type].map((c) => c.sort_order)) + 1
      const { error } = await supabase.from('categories').insert({ type, name: clean, emoji, color, sort_order, monthly_limit: monthlyLimit })
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [byType, refresh]
  )

  const update = useCallback(
    async (id: string, patch: { name?: string; emoji?: string; color?: string; monthly_limit?: number | null }) => {
      const clean = patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch
      if (clean.name !== undefined && !clean.name) throw new Error('Kateqoriyanın adını yazın.')
      const { error } = await supabase.from('categories').update(clean).eq('id', id)
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw new Error(friendlyError(error))
      await refresh()
    },
    [refresh]
  )

  const value: CategoriesValue = { all, byType, loading: loading && !data, error, refresh, find, add, update, remove }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Kateqoriya silinib/dəyişibsə də köhnə əməliyyatlarda nəsə göstərmək üçün ehtiyat dəyər */
export const categoryFallback = (name: string): Category => ({ ...FALLBACK, name })
