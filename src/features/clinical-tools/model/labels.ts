import type { LicenseStatus, ReviewStatus, ToolKind } from './types'

export const TOOL_KIND_LABELS: Record<ToolKind, string> = {
  clinical_test: 'Teste clínico',
  scale: 'Escala',
  calculator: 'Calculadora',
  physical_assessment: 'Avaliação física',
  rehab_protocol: 'Protocolo de reabilitação',
  therapeutic_modality: 'Recurso terapêutico',
  clinical_reference: 'Referência clínica',
  professional_template: 'Modelo profissional',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  verified: 'Conteúdo verificado',
  product_template: 'Modelo do Fisio',
  professional_guidance: 'Orientação profissional',
}

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  public_knowledge: 'Conhecimento publicado',
  free_clinical_use: 'Uso clínico livre, com condições',
  copyright_restricted: 'Licença restrita',
  product_original: 'Material autoral do Fisio',
}
