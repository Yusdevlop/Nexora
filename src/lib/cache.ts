// Offline görünüş üçün son alınan məlumatın istifadəçiyə bağlı nüsxəsi.
// Əsas məlumat həmişə cloud-dadır; bu yalnız internet olmayanda köhnə görüntünü göstərir.
const PREFIX = 'kapital:v1:'

export function readCache<T>(userId: string, key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}:${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(userId: string, key: string, value: unknown) {
  try {
    localStorage.setItem(`${PREFIX}${userId}:${key}`, JSON.stringify(value))
  } catch {
    /* yer bitibsə keş yazılmır — problem deyil */
  }
}

export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
