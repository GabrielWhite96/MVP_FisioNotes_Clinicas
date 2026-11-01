import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/states'
import { getToolBySlug } from '../model/catalog'
import { getCategory, getSpecialty, getSubcategory } from '../model/categories'
import { LICENSE_STATUS_LABELS, REVIEW_STATUS_LABELS, TOOL_KIND_LABELS } from '../model/labels'
import type { ClinicalTool, SourcedNote } from '../model/types'
import { CalculatorPanel } from './calculator-panel'
import { FavoriteButton } from './favorite-button'
import { useToolPrefs } from './use-tool-prefs'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function Notes({ notes, tool }: { notes: SourcedNote[]; tool: ClinicalTool }) {
  return (
    <ul className="space-y-3">
      {notes.map((note) => {
        const source = tool.sources[note.sourceIndex]
        return (
          <li key={`${note.sourceIndex}-${note.text}`} className="text-sm">
            <p>{note.text}</p>
            {note.population && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{note.population}</p>
            )}
            {source && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{source.citation}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function stepsTitle(tool: ClinicalTool): string {
  if (tool.kind === 'rehab_protocol') return pt.tools.principles
  return pt.tools.steps
}

export function PhysioToolDetailPage() {
  const { slug } = useParams()
  const tool = slug ? getToolBySlug(slug) : undefined
  const { favorites, toggle, markRecent } = useToolPrefs()

  useEffect(() => {
    if (tool) markRecent(tool.id)
  }, [tool, markRecent])

  if (!tool) {
    return (
      
        <EmptyState
          title={pt.tools.notFound}
          description={pt.tools.notFoundDescription}
          action={<Button asChild variant="outline"><Link to={ROUTES.physio.tools}>{pt.tools.back}</Link></Button>}
        />
      
    )
  }

  const category = getCategory(tool.categoryId)
  const subcategory = getSubcategory(tool.categoryId, tool.subcategoryId)
  const related = tool.relatedToolIds.flatMap((id) => {
    const item = getToolBySlug(id)
    return item ? [item] : []
  })

  return (
    
      <article className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.physio.tools}>{pt.tools.back}</Link>
        </Button>

        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="page-title">{tool.name}</h1>
            <FavoriteButton
              active={favorites.includes(tool.id)}
              name={tool.name}
              onToggle={() => toggle(tool.id)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TOOL_KIND_LABELS[tool.kind]}</Badge>
            <Badge variant={tool.reviewStatus === 'verified' ? 'success' : 'outline'}>
              {REVIEW_STATUS_LABELS[tool.reviewStatus]}
            </Badge>
            <Badge variant="outline">{LICENSE_STATUS_LABELS[tool.license.status]}</Badge>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {[category?.label, subcategory?.label].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm">{tool.shortDescription}</p>
        </header>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm">
          {pt.tools.disclaimer}
        </div>

        <Section title={pt.tools.purposeLabel}>
          <p className="text-sm">{tool.purpose}</p>
        </Section>

        <CalculatorPanel tool={tool} />

        {tool.indications && tool.indications.length > 0 && (
          <Section title={pt.tools.indications}><ItemList items={tool.indications} /></Section>
        )}
        {tool.contraindications && tool.contraindications.length > 0 && (
          <Section title={pt.tools.contraindications}><ItemList items={tool.contraindications} /></Section>
        )}
        {tool.materials && tool.materials.length > 0 && (
          <Section title={pt.tools.materials}><ItemList items={tool.materials} /></Section>
        )}
        {tool.positioning && (
          <Section title={pt.tools.positioning}><p className="text-sm">{tool.positioning}</p></Section>
        )}
        {tool.steps && tool.steps.length > 0 && (
          <Section title={stepsTitle(tool)}>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {tool.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </Section>
        )}
        {tool.interpretation && (
          <Section title={pt.tools.interpretation}><p className="text-sm">{tool.interpretation}</p></Section>
        )}
        {tool.referenceValues && tool.referenceValues.length > 0 && (
          <Section title={pt.tools.referenceValues}><Notes notes={tool.referenceValues} tool={tool} /></Section>
        )}
        {tool.psychometrics && tool.psychometrics.length > 0 && (
          <Section title={pt.tools.psychometrics}><Notes notes={tool.psychometrics} tool={tool} /></Section>
        )}
        {tool.parameterNote && (
          <Section title={pt.tools.parameterTitle}><p className="text-sm">{tool.parameterNote}</p></Section>
        )}

        {tool.populations.length > 0 && (
          <Section title={pt.tools.populations}><ItemList items={tool.populations} /></Section>
        )}
        {tool.limitations.length > 0 && (
          <Section title={pt.tools.limitations}><ItemList items={tool.limitations} /></Section>
        )}

        <Section title={pt.tools.license}>
          <p className="text-sm">{LICENSE_STATUS_LABELS[tool.license.status]}. {tool.license.notes}</p>
        </Section>

        {tool.specialties.length > 0 && (
          <Section title={pt.tools.specialty}>
            <p className="text-sm">
              {tool.specialties.map((id) => getSpecialty(id)?.label ?? id).join(', ')}
            </p>
          </Section>
        )}

        <Section title={pt.tools.sources}>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {tool.sources.map((source) => (
              <li key={source.citation}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {source.citation}
                  </a>
                ) : source.citation}
              </li>
            ))}
          </ol>
        </Section>

        {related.length > 0 && (
          <Section title={pt.tools.related}>
            <ul className="space-y-2">
              {related.map((item) => (
                <li key={item.id}>
                  <Link to={ROUTES.physio.tool(item.slug)} className="text-sm font-medium underline-offset-2 hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{item.shortDescription}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>
    
  )
}
