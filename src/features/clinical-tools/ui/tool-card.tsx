import { Link } from 'react-router-dom'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { Badge } from '@/shared/ui/badge'
import { REVIEW_STATUS_LABELS, TOOL_KIND_LABELS } from '../model/labels'
import type { ClinicalTool } from '../model/types'
import { FavoriteButton } from './favorite-button'

export function ToolCard({
  tool,
  favorite,
  onToggleFavorite,
}: {
  tool: ClinicalTool
  favorite: boolean
  onToggleFavorite: () => void
}) {
  return (
    <article className="surface-tape flex gap-2 bg-[var(--color-card)] p-4">
      <Link to={ROUTES.physio.tool(tool.slug)} className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{TOOL_KIND_LABELS[tool.kind]}</Badge>
          <Badge variant={tool.reviewStatus === 'verified' ? 'success' : 'outline'}>
            {REVIEW_STATUS_LABELS[tool.reviewStatus]}
          </Badge>
        </div>
        <h2 className="font-display text-lg font-semibold leading-snug">{tool.name}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">{tool.shortDescription}</p>
        <p className="text-sm">
          <span className="font-medium">{pt.tools.purposeLabel}: </span>
          {tool.purpose}
        </p>
      </Link>
      <FavoriteButton active={favorite} name={tool.name} onToggle={onToggleFavorite} />
    </article>
  )
}
