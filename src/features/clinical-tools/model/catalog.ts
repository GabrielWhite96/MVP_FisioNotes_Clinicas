import { getCategory, getPurpose, getSpecialty, TOOL_CATEGORIES } from './categories'
import { assessmentTools } from './content/assessment'
import { calculatorTools } from './content/calculators'
import { modalityTools } from './content/modalities'
import { protocolTools } from './content/protocols'
import { referenceTools } from './content/references'
import { scaleTools } from './content/scales'
import { templateTools } from './content/templates'
import { testTools } from './content/tests'
import type { ClinicalTool } from './types'

export const CLINICAL_TOOLS: ClinicalTool[] = [
  ...testTools,
  ...scaleTools,
  ...calculatorTools,
  ...assessmentTools,
  ...protocolTools,
  ...modalityTools,
  ...referenceTools,
  ...templateTools,
]

const byId = new Map(CLINICAL_TOOLS.map((tool) => [tool.id, tool]))

export function getToolBySlug(slug: string): ClinicalTool | undefined {
  return byId.get(slug)
}

export function catalogIssues(tools: ClinicalTool[] = CLINICAL_TOOLS): string[] {
  const issues: string[] = []
  const ids = new Set<string>()
  const storedCategoryIds = new Set(
    TOOL_CATEGORIES.filter((category) => category.id !== 'application_protocols').map((category) => category.id),
  )

  for (const tool of tools) {
    if (ids.has(tool.id)) issues.push(`id duplicado: ${tool.id}`)
    ids.add(tool.id)
    if (tool.slug !== tool.id) issues.push(`slug diferente do id: ${tool.id}`)
    if (tool.sources.length === 0) issues.push(`sem fonte: ${tool.id}`)
    if (!storedCategoryIds.has(tool.categoryId)) issues.push(`categoria inválida: ${tool.id}`)
    const category = getCategory(tool.categoryId)
    if (category && !category.subcategories.some((item) => item.id === tool.subcategoryId)) {
      issues.push(`subcategoria inválida: ${tool.id}`)
    }
    for (const specialty of tool.specialties) {
      if (!getSpecialty(specialty)) issues.push(`especialidade inválida em ${tool.id}: ${specialty}`)
    }
    for (const purpose of tool.clinicalPurposes) {
      if (!getPurpose(purpose)) issues.push(`finalidade inválida em ${tool.id}: ${purpose}`)
    }
    for (const note of [...(tool.referenceValues ?? []), ...(tool.psychometrics ?? [])]) {
      if (note.sourceIndex < 0 || note.sourceIndex >= tool.sources.length) {
        issues.push(`fonte numérica sem índice válido: ${tool.id}`)
      }
    }
    if (tool.kind === 'calculator' && tool.fields.length === 0) issues.push(`calculadora sem campos: ${tool.id}`)
    if (tool.reviewStatus === 'verified' && tool.sources.every((source) => source.type === 'institution' && source.citation.startsWith('Fisionotes'))) {
      issues.push(`verificada só com texto autoral: ${tool.id}`)
    }
  }

  for (const tool of tools) {
    for (const related of tool.relatedToolIds) {
      if (!ids.has(related)) issues.push(`relação inexistente em ${tool.id}: ${related}`)
    }
  }

  return issues
}
