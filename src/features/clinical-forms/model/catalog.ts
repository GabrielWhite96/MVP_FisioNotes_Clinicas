export type ClinicFormSlug =
  | 'avaliacao-inicial'
  | 'anamnese'
  | 'evolucao'
  | 'reavaliacao'
  | 'alta'

export interface ClinicFormTemplate {
  slug: ClinicFormSlug
  title: string
  description: string
}

export const CLINIC_FORMS: ClinicFormTemplate[] = [
  {
    slug: 'avaliacao-inicial',
    title: 'Primeira avaliação fisioterapêutica',
    description: 'Identificação, anamnese, exame físico, achados e plano terapêutico para preenchimento manual.',
  },
  {
    slug: 'anamnese',
    title: 'Anamnese',
    description: 'Queixa principal, história da doença atual, antecedentes, medicações e cirurgias.',
  },
  {
    slug: 'evolucao',
    title: 'Evolução / sessão de atendimento',
    description: 'Sinais vitais, condutas da sessão e observações de cada atendimento.',
  },
  {
    slug: 'reavaliacao',
    title: 'Reavaliação fisioterapêutica',
    description: 'Mesmos blocos da avaliação inicial, com espaço para comparar com o quadro anterior.',
  },
  {
    slug: 'alta',
    title: 'Alta fisioterapêutica',
    description: 'Resumo do tratamento, condutas, orientações e destino no encerramento.',
  },
]

export function getClinicForm(slug: string) {
  return CLINIC_FORMS.find((form) => form.slug === slug) ?? null
}
