import type { TxType } from './types'

export const TYPE_LABEL: Record<TxType, string> = {
  income: 'Gəlir',
  expense: 'Xərc',
  saving: 'Yığım'
}

export const GOAL_SUGGESTIONS = ['Biznes', 'Ofis', 'Türkiyə', 'Avadanlıq', 'Digər']

export const MEMBER_COLORS = ['#5BE3C0', '#9DB0FF', '#F6C667', '#FF8FA3', '#C9A2FF', '#7CD6FF']

/** Yeni kateqoriya yaradanda seçmək üçün rəng palitrası */
export const CATEGORY_COLORS = ['#5BE3C0', '#9DB0FF', '#FF8FA3', '#F6C667', '#C9A2FF', '#7CD6FF', '#FF9E5E', '#6FE0A0', '#E080C0', '#93A1BB']

/** Yeni kateqoriya yaradanda seçmək üçün emoji dəsti (istəyə görə əl ilə də yazıla bilər) */
export const EMOJI_CHOICES = [
  '🧾', '🍽️', '🚕', '💡', '🛍️', '💊', '🎬', '📚', '🏠', '📱',
  '💼', '📈', '🎁', '✨', '🐷', '🛟', '✈️', '🚀', '🪙', '☕',
  '🐾', '👶', '🎓', '⚽', '🎮', '💇', '🧴', '🔧', '🚗', '❤️'
]
