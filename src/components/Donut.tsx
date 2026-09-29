import type { CatSlice } from '../lib/stats'
import { money } from '../lib/format'

interface Props {
  slices: CatSlice[]
  total: number
  centerLabel?: string
}

/** Kateqoriya paylanmasını dairəvi (donut) qrafiklə və siyahı ilə göstərir: hər sətirdə faiz + məbləğ */
export function Donut({ slices, total, centerLabel }: Props) {
  const R = 60
  const CX = 70
  const CY = 70
  const STROKE = 26
  const CIRC = 2 * Math.PI * R

  let acc = 0
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.amount / total : 0
    const dash = Math.max(0, frac * CIRC - (slices.length > 1 ? 2 : 0))
    const offset = CIRC - acc * CIRC
    acc += frac
    return { ...s, dash, offset }
  })

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Kateqoriya paylanması">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
        {arcs.map((a, i) => (
          <circle
            key={a.name + i}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth={STROKE}
            strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
            strokeDashoffset={a.offset}
            transform={`rotate(-90 ${CX} ${CY})`}
            strokeLinecap={slices.length > 1 ? 'round' : 'butt'}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" className="donut-total">
          {money(total)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" className="donut-caption">
          {centerLabel ?? 'cəmi'}
        </text>
      </svg>
      <div className="donut-legend">
        {slices.length === 0 && <p className="muted small">Bu dövrdə məlumat yoxdur.</p>}
        {slices.map((s) => (
          <div key={s.name} className="donut-row">
            <i className="dot" style={{ background: s.color }} />
            <span className="donut-name">
              {s.emoji} {s.name}
            </span>
            <span className="donut-pct">{Math.round(s.pct)}%</span>
            <b className="donut-amount">{money(s.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
