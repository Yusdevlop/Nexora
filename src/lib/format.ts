/** 6981.5 → "6 981,5" (Azərbaycan yazılışı: boşluqla mində, vergüllə kəsr; cihazın dilindən asılı deyil) */
export function num(n: number): string {
  const r = Math.round(n * 100) / 100
  const [int, frac] = Math.abs(r).toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  const tail = frac.replace(/0+$/, '')
  return `${r < 0 ? '−' : ''}${grouped}${tail ? `,${tail}` : ''}`
}

export const money = (n: number) => `${num(n)}\u00A0AZN`
export const signedMoney = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}\u00A0AZN`
export const compact = (n: number) => (Math.abs(n) >= 1000 ? `${num(Math.round(n / 100) / 10)}k` : num(Math.round(n)))

/** "12,5" və "1 200.50" kimi yazılışları ədədə çevirir */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/\s/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

const pad = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => isoOf(new Date())
export const yesterdayISO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return isoOf(d)
}
export const monthKey = (iso: string) => iso.slice(0, 7)
export const currentMonthKey = () => monthKey(todayISO())

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const name = MONTHS[m - 1]
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`
}

export function dayLabel(iso: string): string {
  if (iso === todayISO()) return 'Bu gün'
  if (iso === yesterdayISO()) return 'Dünən'
  const [y, m, d] = iso.split('-').map(Number)
  const thisYear = new Date().getFullYear()
  return `${d} ${MONTHS[m - 1]}${y !== thisYear ? ` ${y}` : ''}`
}

export function timeOf(ts: string): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dateKeyOfTs(ts: string): string {
  return isoOf(new Date(ts))
}

export function deadlineInfo(deadline: string | null): { text: string; tone: 'ok' | 'soon' | 'late' } | null {
  if (!deadline) return null
  const [y, m, d] = deadline.split('-').map(Number)
  const end = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.round((end - today) / 86400000)
  const label = `${d} ${MONTHS[m - 1]} ${y}`
  if (days < 0) return { text: `${label} · ${Math.abs(days)} gün gecikib`, tone: 'late' }
  if (days === 0) return { text: `${label} · bu gün bitir`, tone: 'soon' }
  if (days <= 14) return { text: `${label} · ${days} gün qalıb`, tone: 'soon' }
  return { text: `${label} · ${days} gün qalıb`, tone: 'ok' }
}

export function friendlyError(e: unknown): string {
  let msg = ''
  if (e instanceof Error) msg = e.message
  else if (e && typeof e === 'object' && 'message' in e) msg = String((e as { message: unknown }).message)
  else msg = String(e)
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'E-poçt və ya şifrə səhvdir.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Bu e-poçt artıq qeydiyyatdan keçib. Giriş edin.'
  if (m.includes('email not confirmed')) return 'E-poçtunuz təsdiqlənməyib. Gələn qutunuzdakı linkə toxunun.'
  if (m.includes('password should be at least')) return 'Şifrə ən azı 6 simvol olmalıdır.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Çox sayda cəhd oldu. Bir az sonra yenidən yoxlayın.'
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) return 'İnternet bağlantısı yoxdur. Bağlantını yoxlayıb yenidən cəhd edin.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'E-poçt ünvanı düzgün deyil.'
  return msg || 'Xəta baş verdi. Yenidən cəhd edin.'
}
