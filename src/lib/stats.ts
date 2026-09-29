import type { Transaction, TxType } from './types'
import { MONTHS_SHORT, monthKey, shiftMonth, currentMonthKey, todayISO, isoOf } from './format'
import type { MonthBar } from '../components/Bits'

export type Totals = Record<TxType, number>
const zero = (): Totals => ({ income: 0, expense: 0, saving: 0 })

export function totalsOf(items: Transaction[], filter?: (t: Transaction) => boolean): Totals {
  const out = zero()
  for (const t of items) if (!filter || filter(t)) out[t.type] += t.amount
  return out
}

export const balanceOf = (t: Totals) => Math.round((t.income - t.expense - t.saving) * 100) / 100

export function lastMonths(items: Transaction[], count = 6): MonthBar[] {
  const now = currentMonthKey()
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(now, i - (count - 1)))
  return keys.map((k) => {
    const t = totalsOf(items, (x) => monthKey(x.occurred_on) === k)
    return { label: MONTHS_SHORT[Number(k.slice(5, 7)) - 1], income: t.income, expense: t.expense }
  })
}

/* ------------------------------ Seçilə bilən dövr ------------------------------ */
export type RangeKey = 'week' | 'month' | 'quarter' | 'all'
export const RANGE_LABEL: Record<RangeKey, string> = { week: 'Bu həftə', month: 'Bu ay', quarter: 'Son 3 ay', all: 'Hamısı' }
export const RANGES: RangeKey[] = ['week', 'month', 'quarter', 'all']

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Seçilmiş dövr üçün gəlir/xərc trendi: həftə→günlük, ay→günlük, 3 ay→həftəlik, hamısı→aylıq */
export function rangeBars(items: Transaction[], range: RangeKey): MonthBar[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sumFor = (fromISO: string, toISO: string) => totalsOf(items, (t) => t.occurred_on >= fromISO && t.occurred_on <= toISO)

  if (range === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const key = isoOf(d)
      const t = sumFor(key, key)
      return { label: String(d.getDate()), income: t.income, expense: t.expense }
    })
  }
  if (range === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const days = today.getDate()
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(start, i)
      const key = isoOf(d)
      const t = sumFor(key, key)
      return { label: String(d.getDate()), income: t.income, expense: t.expense }
    })
  }
  if (range === 'quarter') {
    const weeks = 13
    const dow = (today.getDay() + 6) % 7 // 0 = Bazar ertəsi
    const thisWeekStart = addDays(today, -dow)
    return Array.from({ length: weeks }, (_, i) => {
      const start = addDays(thisWeekStart, (i - (weeks - 1)) * 7)
      const end = addDays(start, 6)
      const t = sumFor(isoOf(start), isoOf(end))
      return { label: `${start.getDate()}/${start.getMonth() + 1}`, income: t.income, expense: t.expense }
    })
  }
  // all: istifadəyə başladığınız aydan bu ana qədər, aylıq (ən çox 24 sütun)
  if (items.length === 0) return []
  const firstKey = items.reduce((min, t) => (t.occurred_on < min ? t.occurred_on : min), items[0].occurred_on).slice(0, 7)
  const nowKey = currentMonthKey()
  let count = 1
  for (let k = firstKey; k !== nowKey; k = shiftMonth(k, 1)) count++
  count = Math.min(count, 24)
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(nowKey, i - (count - 1)))
  return keys.map((k) => {
    const t = totalsOf(items, (x) => monthKey(x.occurred_on) === k)
    return { label: MONTHS_SHORT[Number(k.slice(5, 7)) - 1], income: t.income, expense: t.expense }
  })
}

function rangeStartISO(range: RangeKey): string {
  const today = new Date()
  if (range === 'week') return isoOf(addDays(today, -6))
  if (range === 'month') return `${monthKey(todayISO())}-01`
  if (range === 'quarter') return isoOf(addDays(today, -89))
  return '' // all
}

export interface CatSlice {
  name: string
  emoji: string
  color: string
  amount: number
  pct: number
}

/** Seçilmiş dövrdə, bir növ (xərc/gəlir/yığım) üzrə kateqoriya paylanması: faiz + məbləğ, azalan sırada */
export function categoryBreakdown(
  items: Transaction[],
  type: TxType,
  range: RangeKey,
  lookup: (type: TxType, name: string) => { emoji: string; color: string }
): CatSlice[] {
  const from = rangeStartISO(range)
  const today = todayISO()
  const map = new Map<string, number>()
  for (const t of items) {
    if (t.type !== type) continue
    if (t.occurred_on > today) continue
    if (from && t.occurred_on < from) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()]
    .map(([name, amount]) => {
      const c = lookup(type, name)
      return { name, emoji: c.emoji, color: c.color, amount: Math.round(amount * 100) / 100, pct: total ? (amount / total) * 100 : 0 }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function totalsInRange(items: Transaction[], range: RangeKey): Totals {
  const from = rangeStartISO(range)
  const today = todayISO()
  return totalsOf(items, (t) => t.occurred_on <= today && (!from || t.occurred_on >= from))
}
