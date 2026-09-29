// Claude-hosted (tək HTML fayl) versiyada service worker yoxdur, ona görə
// "virtual:pwa-register/react" modulunun yerinə bu boş stub qoyulur (bax vite.config.ts).
import { useState } from 'react'

export function useRegisterSW() {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return { needRefresh, offlineReady, updateServiceWorker: async () => {} }
}
