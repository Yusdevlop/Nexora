import type { ReactNode } from 'react'
import type { Slice } from '../lib/groupMath'
import { compact } from '../lib/format'

export function Avatar({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  const initial = (name.trim().charAt(0) || '?').toLocaleUpperCase('az')
  return (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {initial}
    </span>
  )
}

export function AvatarStack({ slices, max = 4 }: { slices: { name: string; color: string }[]; max?: number }) {
  const shown = slices.slice(0, max)
  const extra = slices.length - shown.length
  return (
    <span className="avatar-stack">
      {shown.map((s, i) => (
        <Avatar key={i} name={s.name} color={s.color} size={28} />
      ))}
      {extra > 0 && <span className="avatar avatar-more">+{extra}</span>}
    </span>
  )
}

/** Üzvlərin payına görə rənglənmiş yığım zolağı — kimin nə qədər qoyduğunu göstərir. */
export function SplitBar({ slices, target, thick = false }: { slices: Slice[]; target: number; thick?: boolean }) {
  const positive = slices.filter((s) => s.amount > 0)
  const total = positive.reduce((s, x) => s + x.amount, 0)
  const base = Math.max(target, total, 1)
  return (
    <div className={`splitbar${thick ? ' thick' : ''}`} role="img" aria-label="Yığım irəliləyişi">
      {positive.map((s) => (
        <span key={s.userId} className="seg" style={{ width: `${(s.amount / base) * 100}%`, background: s.color }} title={`${s.name}: ${s.amount}`} />
      ))}
    </div>
  )
}

export interface MonthBar {
  label: string
  income: number
  expense: number
}

/** Mobilə uyğun, kitabxanasız aylıq gəlir/xərc qrafiki */
export function MonthlyBars({ data }: { data: MonthBar[] }) {
  const W = 320
  const H = 150
  const top = 22
  const bottom = 26
  const plotH = H - top - bottom
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const slot = W / data.length
  const bw = 11
  const h = (v: number) => (v <= 0 ? 0 : Math.max(4, (v / max) * plotH))
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Son 6 ayın gəlir və xərcləri">
      <line x1="0" x2={W} y1={H - bottom} y2={H - bottom} className="chart-axis" />
      {data.map((d, i) => {
        const cx = slot * i + slot / 2
        const hi = h(d.income)
        const he = h(d.expense)
        return (
          <g key={d.label + i}>
            <rect x={cx - bw - 2} y={H - bottom - hi} width={bw} height={hi} rx={5} className="bar-income" />
            <rect x={cx + 2} y={H - bottom - he} width={bw} height={he} rx={5} className="bar-expense" />
            <text x={cx} y={H - 8} textAnchor="middle" className="chart-label">
              {d.label}
            </text>
            {(d.income > 0 || d.expense > 0) && (
              <text x={cx} y={H - bottom - Math.max(hi, he) - 5} textAnchor="middle" className="chart-value">
                {compact(Math.max(d.income, d.expense))}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function EmptyState({ emoji, title, text, children }: { emoji: string; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji" aria-hidden>
        {emoji}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  )
}
