import { useRegisterSW } from 'virtual:pwa-register/react'
import { useState } from 'react'
import { LogoMark } from './Logo'

/**
 * Yeni versiya arxa planda yüklənəndə tətbiqi bloklayan ekran göstərir.
 * Düyməyə basılana qədər köhnə versiya ilə davam etmək mümkün deyil —
 * beləcə heç kim bilmədən köhnə (keşlənmiş) nüsxə ilə qalmır.
 */
export function UpdateGate() {
  const [busy, setBusy] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: () => {} })

  if (!needRefresh) return null

  return (
    <div className="update-gate" role="alertdialog" aria-modal="true" aria-label="Yeniləmə tələb olunur">
      <div className="update-gate-card">
        <LogoMark size={56} />
        <h2>Yeni versiya var</h2>
        <p>Kapital yenilənib. Davam etmək üçün tətbiqi yeniləyin — bir neçə saniyə çəkəcək.</p>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void updateServiceWorker(true)
          }}
        >
          {busy ? 'Yenilənir…' : 'Yenilə'}
        </button>
      </div>
    </div>
  )
}
