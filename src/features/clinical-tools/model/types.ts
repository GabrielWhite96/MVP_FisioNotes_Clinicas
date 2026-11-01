export const TOOL_KINDS = [
  'clinical_test',
  'scale',
  'calculator',
  'physical_assessment',
  'rehab_protocol',
  'therapeutic_modality',
  'clinical_reference',
  'professional_template',
] as const

export type ToolKind = (typeof TOOL_KINDS)[number]

export type ReviewStatus = 'verified' | 'product_template' | 'professional_guidance'

export type LicenseStatus =
  | 'public_knowledge'
  | 'free_clinical_use'
  | 'copyright_restricted'
  | 'product_original'

export type SourceType = 'guideline' | 'systematic_review' | 'original_article' | 'institution' | 'textbook'

export interface ClinicalSource {
  citation: string
  url?: string
  year?: number
  type: SourceType
}

export interface SourcedNote {
  text: string
  sourceIndex: number
  population?: string
}

export interface CalculatorField {
  id: string
  label: string
  unit?: string
  min?: number
  max?: number
  step?: number
  required: boolean
  help?: string
  input: 'number' | 'select'
  options?: Array<{ value: string; label: string }>
  visibleWhen?: { id: string; value: string }
}

export interface CalculatorResultLine {
  label: string
  value: string
  detail?: string
}

export interface CalculatorResult {
  lines: CalculatorResultLine[]
  explanation: string
  limitations: string[]
}

export type CalculatorOutcome = CalculatorResult | { error: string }

export type CalculatorValues = Record<string, string>

export interface ToolBase {
  id: string
  slug: string
  name: string
  shortDescription: string
  purpose: string
  categoryId: string
  subcategoryId: string
  specialties: string[]
  bodyRegions: string[]
  clinicalPurposes: string[]
  searchTerms: string[]
  reviewStatus: ReviewStatus
  populations: string[]
  limitations: string[]
  license: { status: LicenseStatus; notes: string }
  professionalJudgment: boolean
  relatedToolIds: string[]
  sources: ClinicalSource[]
  indications?: string[]
  contraindications?: string[]
  materials?: string[]
  positioning?: string
  steps?: string[]
  interpretation?: string
  referenceValues?: SourcedNote[]
  psychometrics?: SourcedNote[]
  parameterNote?: string
}

interface InteractiveFields {
  fields: CalculatorField[]
  compute: (values: CalculatorValues) => CalculatorOutcome
}

export type ClinicalTool =
  | (ToolBase & { kind: 'calculator' } & InteractiveFields)
  | (ToolBase & {
      kind: 'scale'
      fields?: CalculatorField[]
      compute?: (values: CalculatorValues) => CalculatorOutcome
    })
  | (ToolBase & { kind: Exclude<ToolKind, 'calculator' | 'scale'> })

export function isInteractiveTool(
  tool: ClinicalTool,
): tool is Extract<ClinicalTool, { kind: 'calculator' | 'scale' }> & InteractiveFields {
  if (tool.kind !== 'calculator' && tool.kind !== 'scale') return false
  return Array.isArray(tool.fields) && typeof tool.compute === 'function'
}
