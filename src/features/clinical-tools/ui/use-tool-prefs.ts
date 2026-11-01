import { useCallback, useState } from 'react'
import { pushRecent, readFavorites, readRecents, toggleFavorite } from '../model/storage'

export function useToolPrefs() {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites())
  const [recents, setRecents] = useState<string[]>(() => readRecents())

  const toggle = useCallback((id: string) => {
    setFavorites(toggleFavorite(id))
  }, [])

  const markRecent = useCallback((id: string) => {
    setRecents(pushRecent(id))
  }, [])

  return { favorites, recents, toggle, markRecent }
}
