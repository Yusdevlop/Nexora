/** true = Claude-in-hosted variant (məlumat Claude `db`-sində); false = Supabase variantı */
export const CLAUDE_MODE = import.meta.env.VITE_BACKEND === 'claude'
