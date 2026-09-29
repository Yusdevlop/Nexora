import type { Transaction } from './types'
import { TYPE_LABEL } from './categories'
import { money, dayLabel } from './format'

function csvCell(v: string): string {
  const needsQuotes = /[",\n;]/.test(v)
  const escaped = v.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

/** Əməliyyatları CSV faylı kimi endirir (Excel/Google Sheets-də açılır). Excel üçün UTF-8 BOM əlavə olunur. */
export function downloadCSV(items: Transaction[], filename: string) {
  const header = ['Tarix', 'Növ', 'Kateqoriya', 'Qeyd', 'Məbləğ (AZN)']
  const rows = items.map((t) => [t.occurred_on, TYPE_LABEL[t.type], t.category, t.note ?? '', String(t.amount)])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Çap üçün hazır hesabat açır (istifadəçi brauzerin çap pəncərəsindən "PDF olaraq saxla" seçə bilər).
 * Ayrıca PDF kitabxanası əlavə etməmək üçün bilərəkdən bu yol seçilib — bütün brauzerlərdə işləyir.
 */
export function openPrintableStatement(items: Transaction[], title: string) {
  const win = window.open('', '_blank')
  if (!win) return false

  const totalIncome = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSaving = items.filter((t) => t.type === 'saving').reduce((s, t) => s + t.amount, 0)

  const rows = items
    .map(
      (t) => `<tr>
      <td>${dayLabel(t.occurred_on)}</td>
      <td>${TYPE_LABEL[t.type]}</td>
      <td>${t.category}</td>
      <td>${(t.note ?? '').replace(/</g, '&lt;')}</td>
      <td style="text-align:right">${money(t.amount)}</td>
    </tr>`
    )
    .join('')

  win.document.write(`<!doctype html>
<html lang="az"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .muted { color: #666; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }
  th { color: #666; font-weight: 600; }
  .totals { margin-top: 20px; display: flex; gap: 24px; font-size: 14px; }
  .totals b { display: block; font-size: 16px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Kapital — ${title}</h1>
  <p class="muted">Yaradıldı: ${new Date().toLocaleDateString('az-AZ')} · ${items.length} əməliyyat</p>
  <div class="totals">
    <div>Gəlir<b>${money(totalIncome)}</b></div>
    <div>Xərc<b>${money(totalExpense)}</b></div>
    <div>Yığım<b>${money(totalSaving)}</b></div>
    <div>Balans<b>${money(totalIncome - totalExpense - totalSaving)}</b></div>
  </div>
  <table>
    <thead><tr><th>Tarix</th><th>Növ</th><th>Kateqoriya</th><th>Qeyd</th><th style="text-align:right">Məbləğ</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => setTimeout(() => window.print(), 200)</script>
</body></html>`)
  win.document.close()
  return true
}
