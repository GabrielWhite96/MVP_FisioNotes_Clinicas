import { getCategory, getPurpose, getSpecialty, getSubcategory } from './categories'
import { TOOL_KIND_LABELS } from './labels'
import type { ClinicalTool } from './types'

export interface ToolQuery {
  text?: string
  categoryId?: string
  subcategoryId?: string
  specialtyId?: string
  purposeId?: string
  favoriteIds?: string[]
  favoritesOnly?: boolean
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function toolMatchesCategory(tool: ClinicalTool, categoryId: string): boolean {
  if (categoryId === 'application_protocols') {
    return tool.kind === 'clinical_test' && (tool.steps?.length ?? 0) > 0
  }
  return tool.categoryId === categoryId
}

function haystack(tool: ClinicalTool): string {
  const category = getCategory(tool.categoryId)
  const subcategory = getSubcategory(tool.categoryId, tool.subcategoryId)
  const parts = [
    tool.name,
    tool.shortDescription,
    tool.purpose,
    TOOL_KIND_LABELS[tool.kind],
    category?.label ?? '',
    subcategory?.label ?? '',
    ...tool.searchTerms,
    ...tool.bodyRegions,
    ...tool.clinicalPurposes.flatMap((id) => [id, getPurpose(id)?.label ?? '']),
    ...tool.specialties.flatMap((id) => [id, getSpecialty(id)?.label ?? '']),
  ]
  return normalizeSearch(parts.join(' '))
}

export function filterTools(tools: ClinicalTool[], query: ToolQuery): ClinicalTool[] {
  const text = normalizeSearch(query.text ?? '')
  const favoriteIds = new Set(query.favoriteIds ?? [])

  const matched = tools.filter((tool) => {
    if (query.categoryId && !toolMatchesCategory(tool, query.categoryId)) return false
    if (query.subcategoryId && tool.subcategoryId !== query.subcategoryId) return false
    if (query.specialtyId && !tool.specialties.includes(query.specialtyId)) return false
    if (query.purposeId && !tool.clinicalPurposes.includes(query.purposeId)) return false
    if (query.favoritesOnly && !favoriteIds.has(tool.id)) return false
    if (text && !haystack(tool).includes(text)) return false
    return true
  })

  return matched.sort((a, b) => {
    if (text) {
      const aName = normalizeSearch(a.name).includes(text) ? 0 : 1
      const bName = normalizeSearch(b.name).includes(text) ? 0 : 1
      if (aName !== bName) return aName - bName
    }
    return a.name.localeCompare(b.name, 'pt')
  })
}
