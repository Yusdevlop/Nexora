import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

const claudeBackend = fileURLToPath(new URL('./src/lib/claudeBackend.ts', import.meta.url))
const pwaStub = fileURLToPath(new URL('./src/lib/pwaRegisterStub.ts', import.meta.url))

export default defineConfig(({ mode }) => {
  // "claude" rejimi: Supabase əvəzinə Claude-un db imkanı, tək HTML fayl, PWA/service worker yoxdur
  if (mode === 'claude') {
    return {
      plugins: [
        {
          name: 'swap-backend',
          enforce: 'pre' as const,
          resolveId(source: string, importer?: string) {
            if (importer && importer.includes('/src/') && /(^|\/)supabase$/.test(source)) return claudeBackend
            // Bu buildə VitePWA daxil deyil, ona görə "virtual:pwa-register/react" mövcud deyil — stub-a yönləndiririk
            if (source === 'virtual:pwa-register/react') return pwaStub
            return null
          }
        },
        {
          name: 'strip-local-links',
          transformIndexHtml: (html: string) => html.replace(/\s*<link rel="(icon|apple-touch-icon)"[^>]*>/g, '').replace(/\s*<script src="\/config\.js"><\/script>/g, '')
        },
        react(),
        viteSingleFile()
      ],
      define: { 'import.meta.env.VITE_BACKEND': JSON.stringify('claude') },
      build: { outDir: 'dist-claude', assetsInlineLimit: 100000000, cssCodeSplit: false }
    }
  }
  return {
  plugins: [
    react(),
    VitePWA({
      // "prompt": yeni versiya arxa planda yüklənir, amma istifadəçi "Yenilə" basmayınca aktivləşmir —
      // bax: src/lib/pwaUpdate.ts + components/UpdateGate.tsx
      registerType: 'prompt',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kapital — Maliyyə və Qrup Yığımı',
        short_name: 'Kapital',
        description: 'Şəxsi maliyyə, məqsədlər və dostlarla birgə yığım.',
        lang: 'az',
        dir: 'ltr',
        start_url: '/?source=pwa',
        scope: '/',
        id: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0D1320',
        theme_color: '#0D1320',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Xərc əlavə et', short_name: 'Xərc', url: '/?add=expense', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Gəlir əlavə et', short_name: 'Gəlir', url: '/?add=income', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Yığım əlavə et', short_name: 'Yığım', url: '/?add=saving', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // config.js istifadəçi tərəfindən redaktə olunur — köhnə nüsxə keşdə ilişib qalmasın
        globIgnores: ['config.js'],
        runtimeCaching: [
          { urlPattern: ({ url }: { url: URL }) => url.pathname === '/config.js', handler: 'StaleWhileRevalidate', options: { cacheName: 'kapital-config' } }
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Bilərəkdən false: yeni versiya "Yenilə" düyməsinə basılana qədər aktivləşməsin (bax UpdateGate)
        clientsClaim: false,
        skipWaiting: false
        // Supabase sorğuları bilərəkdən SW-də keşlənmir: istifadəçiyə aid məlumat
        // başqa hesabla girişdə görünməsin. Offline görünüş üçün src/lib/cache.ts istifadə olunur.
      },
      devOptions: { enabled: false }
    })
  ],
  server: { port: 5173 }
}
})
