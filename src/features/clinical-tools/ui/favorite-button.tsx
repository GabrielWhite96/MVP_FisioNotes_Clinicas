import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { pt } from '@/shared/config/i18n/pt'

export function FavoriteButton({
  active,
  name,
  onToggle,
}: {
  active: boolean
  name: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? pt.tools.removeFavorite.replace('{name}', name) : pt.tools.addFavorite.replace('{name}', name)}
      onClick={onToggle}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-[var(--color-accent)]',
        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]',
      )}
    >
      <Star className={cn('h-4 w-4', active && 'fill-current')} />
    </button>
  )
}
