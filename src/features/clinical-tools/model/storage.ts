const FAVORITES_KEY = 'telefisio.tools.favorites'
const RECENTS_KEY = 'telefisio.tools.recent'
export const MAX_RECENT_TOOLS = 12

function readIds(key: string): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function writeIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids))
}

export function readFavorites(): string[] {
  return readIds(FAVORITES_KEY)
}

export function readRecents(): string[] {
  return readIds(RECENTS_KEY)
}

export function toggleFavorite(id: string): string[] {
  const current = readFavorites()
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]
  writeIds(FAVORITES_KEY, next)
  return next
}

export function pushRecent(id: string): string[] {
  const next = [id, ...readRecents().filter((item) => item !== id)].slice(0, MAX_RECENT_TOOLS)
  writeIds(RECENTS_KEY, next)
  return next
}
