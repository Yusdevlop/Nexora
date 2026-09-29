import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { readCache, writeCache } from './cache'
import { friendlyError } from './format'

export type ChangePayload = RealtimePostgresChangesPayload<Record<string, any>>

interface Options<T> {
  userId: string | undefined
  /** keş açarı — istifadəçiyə bağlı saxlanır */
  key: string
  fetcher: () => Promise<T>
  /** dəyişiklikləri dinləniləcək cədvəllər (real-time) */
  tables: string[]
  onChange?: (table: string, payload: ChangePayload) => void
}

/**
 * Cloud-dan məlumat oxuyur:
 *  1) əvvəlcə oflayn keşi göstərir (dərhal açılış),
 *  2) sonra Supabase-dən təzəsini gətirir,
 *  3) real-time hadisə gələndə, tətbiq yenidən görünəndə və internet qayıdanda avtomatik yeniləyir.
 */
export function useCloud<T>({ userId, key, fetcher, tables, onChange }: Options<T>) {
  const [data, setData] = useState<T | undefined>(() => (userId ? readCache<T>(userId, key) ?? undefined : undefined))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const reqId = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    if (!userId) return
    const id = ++reqId.current
    try {
      const result = await fetchRef.current()
      if (id !== reqId.current) return
      setData(result)
      setError(null)
      writeCache(userId, key, result)
    } catch (e) {
      if (id !== reqId.current) return
      setError(friendlyError(e))
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [userId, key])

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void refresh(), 200)
  }, [refresh])

  useEffect(() => {
    setData(userId ? readCache<T>(userId, key) ?? undefined : undefined)
    setLoading(true)
    void refresh()
  }, [userId, key, refresh])

  const tableList = tables.join(',')
  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`${key}:${Math.random().toString(36).slice(2)}`)
    for (const table of tableList.split(',')) {
      channel.on('postgres_changes', { event: '*' as const, schema: 'public', table }, (payload) => {
        changeRef.current?.(table, payload as ChangePayload)
        schedule()
      })
    }
    let first = true
    channel.subscribe((status) => {
      setLive(status === 'SUBSCRIBED')
      if (status === 'SUBSCRIBED') {
        // bağlantı qopub qayıdıbsa qaçırılmış dəyişiklikləri tuturuq
        if (!first) schedule()
        first = false
      }
    })
    return () => {
      window.clearTimeout(timer.current)
      void supabase.removeChannel(channel)
    }
  }, [userId, key, tableList, schedule])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onOnline = () => void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [refresh])

  return { data, loading, error, live, refresh }
}
