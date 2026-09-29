import type { Category, Transaction } from './types'
import { currentMonthKey, monthKey, shiftMonth, money } from './format'
import { totalsOf } from './stats'

export interface Insight {
  emoji: string
  tone: 'good' | 'info' | 'warn'
  text: string
}

/**
 * Öz məlumatınız üzərində riyazi qaydalarla analiz edir (real AI deyil, açar/server tələb etmir).
 * Kateqoriya limitləri, ay-üstü-ay dəyişiklik, ən çox xərclənən kateqoriya, yığım nisbəti kimi
 * konkret rəqəmlərə əsaslanan bir neçə cümləlik tövsiyə yaradır.
 */
export function computeInsights(items: Transaction[], categories: Category[]): Insight[] {
  const out: Insight[] = []
  if (items.length === 0) return out

  const thisKey = currentMonthKey()
  const lastKey = shiftMonth(thisKey, -1)
  const inMonth = (k: string) => (t: Transaction) => monthKey(t.occurred_on) === k
  const thisMonth = totalsOf(items, inMonth(thisKey))
  const lastMonth = totalsOf(items, inMonth(lastKey))

  // 1) Kateqoriya limitləri
  const expByCat = new Map<string, number>()
  for (const t of items) if (t.type === 'expense' && monthKey(t.occurred_on) === thisKey) expByCat.set(t.category, (expByCat.get(t.category) ?? 0) + t.amount)
  for (const c of categories) {
    if (c.type !== 'expense' || c.monthly_limit == null) continue
    const spent = expByCat.get(c.name) ?? 0
    if (spent > c.monthly_limit) {
      out.push({ emoji: '🚨', tone: 'warn', text: `"${c.name}" limitini keçmisiniz: ${money(spent)} / ${money(c.monthly_limit)}.` })
    } else if (spent > c.monthly_limit * 0.85) {
      out.push({ emoji: '⚠️', tone: 'warn', text: `"${c.name}" limitinizin ${Math.round((spent / c.monthly_limit) * 100)}%-i xərclənib.` })
    }
  }

  // 2) Ən çox xərclənən kateqoriya
  if (thisMonth.expense > 0) {
    const top = [...expByCat.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) {
      const pct = Math.round((top[1] / thisMonth.expense) * 100)
      if (pct >= 40) out.push({ emoji: '🔎', tone: 'warn', text: `Bu ay xərclərinizin ${pct}%-i tək "${top[0]}" kateqoriyasına gedib (${money(top[1])}). Burada azaltmaq ən böyük fərq yaradar.` })
      else out.push({ emoji: '📌', tone: 'info', text: `Bu ay ən çox "${top[0]}" kateqoriyasına xərclənib: ${money(top[1])} (${pct}%).` })
    }
  }

  // 3) Aydan-aya dəyişiklik
  if (lastMonth.expense > 0) {
    const diff = ((thisMonth.expense - lastMonth.expense) / lastMonth.expense) * 100
    if (diff >= 15) out.push({ emoji: '📈', tone: 'warn', text: `Xərcləriniz keçən aya görə ${Math.round(diff)}% artıb.` })
    else if (diff <= -15) out.push({ emoji: '📉', tone: 'good', text: `Xərcləriniz keçən aya görə ${Math.round(Math.abs(diff))}% azalıb, əla!` })
  }

  // 4) Yığım nisbəti
  if (thisMonth.income > 0) {
    const rate = (thisMonth.saving / thisMonth.income) * 100
    if (rate < 5) out.push({ emoji: '🐢', tone: 'warn', text: `Bu ay gəlirinizin yalnız ${Math.round(rate)}%-ni yığmısınız. Hər maaşdan kiçik bir faiz ayırmaq vərdişi faydalı olar.` })
    else if (rate >= 20) out.push({ emoji: '🌟', tone: 'good', text: `Gəlirinizin ${Math.round(rate)}%-ni yığırsınız — çox yaxşı tempdir.` })
  } else if (thisMonth.expense > 0) {
    out.push({ emoji: '❗', tone: 'warn', text: `Bu ay heç gəlir qeyd olunmayıb, amma xərc var. Gəliri də əlavə etsəniz balans dəqiq olar.` })
  }

  // 5) Ümumi balans
  const all = totalsOf(items)
  const balance = all.income - all.expense - all.saving
  if (balance < 0) out.push({ emoji: '🆘', tone: 'warn', text: `Ümumi balansınız mənfidir (${money(balance)}). Xərcləri gəlirlə tarazlamaq üçün ən böyük kateqoriyadan başlayın.` })

  return out.slice(0, 6)
}
