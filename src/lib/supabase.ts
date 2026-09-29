import { createClient } from '@supabase/supabase-js'

// Ayarlar iki yerdən oxunur: (1) build zamanı .env, (2) hazır saytda "config.js" faylı.
// "config.js" kodsuz istifadə üçündür: Notepad-də açıb URL və açarı yazmaq kifayətdir.
const runtime = ((window as unknown as { KAPITAL_CONFIG?: Record<string, string> }).KAPITAL_CONFIG ?? {}) as Record<string, string>

const clean = (v: unknown) => String(v ?? '').trim().replace(/^["']|["']$/g, '')
const rawUrl = clean(import.meta.env.VITE_SUPABASE_URL || runtime.SUPABASE_URL)
// artıq "/" və "/rest/v1" hissələrini avtomatik atırıq
const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY || runtime.SUPABASE_ANON_KEY)

/** URL və açar doldurulubmu? (nümunə dəyərlər sayılmır) */
export const isConfigured = /^https:\/\/.+\.supabase\.(co|in)$/.test(url) && key.length > 20 && !key.includes('...')

export const supabase = createClient(isConfigured ? url : 'http://localhost:54321', isConfigured ? key : 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
