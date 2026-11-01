import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { EmptyState } from '@/shared/ui/states'
import { getCategory, TOOL_CATEGORIES, TOOL_PURPOSES, TOOL_SPECIALTIES } from '../model/categories'
import { CLINICAL_TOOLS, getToolBySlug } from '../model/catalog'
import { filterTools } from '../model/search'
import { ToolCard } from './tool-card'
import { useToolPrefs } from './use-tool-prefs'

const selectClass =
  'flex h-12 w-full rounded-2xl border-0 bg-[var(--color-muted)] px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] md:h-11 md:text-sm'

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
          : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-accent)]',
      )}
    >
      {children}
    </button>
  )
}

export function PhysioToolsPage() {
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [purposeId, setPurposeId] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { favorites, recents, toggle } = useToolPrefs()

  const category = categoryId ? getCategory(categoryId) : undefined
  const filtered = useMemo(
    () => filterTools(CLINICAL_TOOLS, {
      text,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      specialtyId: specialtyId || undefined,
      purposeId: purposeId || undefined,
      favoriteIds: favorites,
      favoritesOnly,
    }),
    [text, categoryId, subcategoryId, specialtyId, purposeId, favorites, favoritesOnly],
  )

  const browsing = !text && !categoryId && !subcategoryId && !specialtyId && !purposeId && !favoritesOnly
  const recentTools = recents.flatMap((id) => {
    const tool = getToolBySlug(id)
    return tool ? [tool] : []
  })
  const favoriteTools = favorites.flatMap((id) => {
    const tool = getToolBySlug(id)
    return tool ? [tool] : []
  })
  const filtersOn = !browsing

  return (
    
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="page-title">{pt.tools.title}</h1>
          <p className="page-kicker">{pt.tools.subtitle}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-search">{pt.tools.searchLabel}</Label>
          <Input
            id="tool-search"
            value={text}
            placeholder={pt.tools.searchPlaceholder}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{pt.tools.specialty}</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={pt.tools.specialty}>
            <Chip active={!specialtyId} onClick={() => setSpecialtyId('')}>
              {pt.tools.allSpecialties}
            </Chip>
            {TOOL_SPECIALTIES.map((item) => (
              <Chip key={item.id} active={specialtyId === item.id} onClick={() => setSpecialtyId(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{pt.tools.category}</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={pt.tools.category}>
            <Chip active={!categoryId} onClick={() => { setCategoryId(''); setSubcategoryId('') }}>
              {pt.tools.allCategories}
            </Chip>
            {TOOL_CATEGORIES.map((item) => (
              <Chip
                key={item.id}
                active={categoryId === item.id}
                onClick={() => { setCategoryId(item.id); setSubcategoryId('') }}
              >
                {item.label}
              </Chip>
            ))}
          </div>
          {category && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">{category.description}</p>
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={pt.tools.subcategory}>
                <Chip active={!subcategoryId} onClick={() => setSubcategoryId('')}>
                  {pt.tools.allSubcategories}
                </Chip>
                {category.subcategories.map((item) => (
                  <Chip key={item.id} active={subcategoryId === item.id} onClick={() => setSubcategoryId(item.id)}>
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tool-purpose">{pt.tools.purpose}</Label>
            <select id="tool-purpose" className={selectClass} value={purposeId} onChange={(event) => setPurposeId(event.target.value)}>
              <option value="">{pt.tools.allPurposes}</option>
              {TOOL_PURPOSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant={favoritesOnly ? 'default' : 'outline'}
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              {pt.tools.favoritesOnly}
            </Button>
          </div>
        </div>

        {browsing && recentTools.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{pt.tools.recents}</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentTools.map((tool) => (
                <Link
                  key={tool.id}
                  to={ROUTES.physio.tool(tool.slug)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-sm hover:border-[var(--color-primary)]"
                >
                  {tool.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {browsing && favoriteTools.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">{pt.tools.favorites}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} favorite onToggleFavorite={() => toggle(tool.id)} />
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pt.tools.results.replace('{count}', String(filtered.length))}
          </p>
          {filtersOn && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setText('')
                setCategoryId('')
                setSubcategoryId('')
                setSpecialtyId('')
                setPurposeId('')
                setFavoritesOnly(false)
              }}
            >
              {pt.tools.clearFilters}
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={categoryId || subcategoryId ? pt.tools.emptyCategory : pt.tools.emptyTitle}
            description={categoryId || subcategoryId ? pt.tools.emptyCategoryDescription : pt.tools.emptyDescription}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                favorite={favorites.includes(tool.id)}
                onToggleFavorite={() => toggle(tool.id)}
              />
            ))}
          </div>
        )}
      </div>
    
  )
}
