export interface ToolTaxon {
  id: string
  label: string
  description?: string
}

export interface ToolCategory extends ToolTaxon {
  description: string
  subcategories: ToolTaxon[]
}

const testSubcategories: ToolTaxon[] = [
  { id: 'ortopedico', label: 'Ortopédicos' },
  { id: 'musculoesqueletico', label: 'Musculoesqueléticos' },
  { id: 'neurologico', label: 'Neurológicos' },
  { id: 'funcional', label: 'Funcionais' },
  { id: 'postural', label: 'Posturais' },
  { id: 'equilibrio', label: 'Equilíbrio' },
  { id: 'marcha', label: 'Marcha' },
  { id: 'mobilidade', label: 'Mobilidade' },
  { id: 'forca', label: 'Força' },
  { id: 'flexibilidade', label: 'Flexibilidade' },
  { id: 'dor', label: 'Dor' },
  { id: 'respiratorio', label: 'Respiratórios' },
  { id: 'pediatrico', label: 'Pediátricos' },
  { id: 'geriatrico', label: 'Geriátricos' },
  { id: 'esportivo', label: 'Esportivos' },
]

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'clinical_tests',
    label: 'Testes e avaliações clínicas',
    description: 'Testes funcionais, de equilíbrio, marcha e mobilidade com protocolo e fonte.',
    subcategories: testSubcategories,
  },
  {
    id: 'application_protocols',
    label: 'Protocolos de aplicação',
    description: 'Passo a passo dos testes que já têm execução descrita nesta biblioteca.',
    subcategories: testSubcategories,
  },
  {
    id: 'scales',
    label: 'Escalas e questionários',
    description: 'Instrumentos com forma de pontuar. Itens protegidos não são reproduzidos.',
    subcategories: [
      { id: 'dor', label: 'Dor' },
      { id: 'forca', label: 'Força' },
      { id: 'incapacidade', label: 'Incapacidade' },
      { id: 'equilibrio', label: 'Equilíbrio' },
      { id: 'membro-superior', label: 'Membro superior' },
      { id: 'osteoartrite', label: 'Osteoartrite' },
      { id: 'qualidade-de-vida', label: 'Qualidade de vida' },
      { id: 'quedas', label: 'Risco de quedas' },
      { id: 'neurologico', label: 'Saúde neurológica' },
    ],
  },
  {
    id: 'calculators',
    label: 'Calculadoras e fórmulas',
    description: 'Fórmulas com variáveis, unidades e limites explícitos.',
    subcategories: [
      { id: 'antropometria', label: 'Antropometria' },
      { id: 'prescricao', label: 'Prescrição de exercício' },
      { id: 'forca', label: 'Força' },
      { id: 'capacidade-aerobia', label: 'Capacidade aeróbia' },
      { id: 'amplitude', label: 'Amplitude de movimento' },
    ],
  },
  {
    id: 'physical_assessment',
    label: 'Avaliação física',
    description: 'Roteiros de medida alinhados aos nomes já usados no prontuário.',
    subcategories: [
      { id: 'goniometria', label: 'Goniometria' },
      { id: 'forca', label: 'Força muscular' },
      { id: 'antropometria', label: 'Antropometria' },
      { id: 'postura', label: 'Postura' },
      { id: 'marcha', label: 'Marcha' },
      { id: 'resistencia', label: 'Resistência' },
    ],
  },
  {
    id: 'rehab_protocols',
    label: 'Protocolos de reabilitação',
    description: 'Princípios publicados. Sem calendário de semanas inventado.',
    subcategories: [
      { id: 'ortopedia', label: 'Ortopedia' },
      { id: 'coluna', label: 'Coluna' },
      { id: 'ombro', label: 'Ombro' },
      { id: 'joelho', label: 'Joelho' },
      { id: 'quadril', label: 'Quadril' },
      { id: 'tornozelo', label: 'Tornozelo' },
      { id: 'neurologia', label: 'Neurologia' },
      { id: 'respiratoria', label: 'Fisioterapia respiratória' },
      { id: 'idoso', label: 'Saúde do idoso' },
      { id: 'esportiva', label: 'Esportiva' },
      { id: 'pos-operatorio', label: 'Pós-operatório' },
    ],
  },
  {
    id: 'therapeutic_resources',
    label: 'Recursos terapêuticos',
    description: 'Indicações e precauções citadas. Dose fica de fora até haver fonte específica.',
    subcategories: [
      { id: 'crioterapia', label: 'Crioterapia' },
      { id: 'termoterapia', label: 'Termoterapia' },
      { id: 'eletroterapia', label: 'Eletroterapia' },
      { id: 'ultrassom', label: 'Ultrassom terapêutico' },
    ],
  },
  {
    id: 'clinical_references',
    label: 'Referências e apoio clínico',
    description: 'Sinais de alerta, encaminhamento e limites do que a evidência sustenta.',
    subcategories: [
      { id: 'sinais-de-alerta', label: 'Sinais de alerta' },
      { id: 'encaminhamento', label: 'Encaminhamento' },
      { id: 'progressao', label: 'Critérios de progressão' },
      { id: 'diretrizes', label: 'Diretrizes' },
    ],
  },
  {
    id: 'professional_templates',
    label: 'Modelos e materiais',
    description: 'Fichas autorais do Fisio para organizar o atendimento. Não são instrumentos validados.',
    subcategories: [
      { id: 'avaliacao', label: 'Fichas de avaliação' },
      { id: 'atendimento', label: 'Roteiros de atendimento' },
      { id: 'tabelas', label: 'Tabelas de referência' },
    ],
  },
]

export const TOOL_SPECIALTIES: ToolTaxon[] = [
  { id: 'musculoesqueletica', label: 'Musculoesquelética' },
  { id: 'ortopedia', label: 'Ortopedia' },
  { id: 'neurologia', label: 'Neurologia' },
  { id: 'geriatria', label: 'Geriatria' },
  { id: 'esportiva', label: 'Esportiva' },
  { id: 'respiratoria', label: 'Respiratória' },
  { id: 'cardiometabolica', label: 'Cardiometabólica' },
]

export const TOOL_PURPOSES: ToolTaxon[] = [
  { id: 'triagem', label: 'Triagem' },
  { id: 'equilibrio', label: 'Equilíbrio' },
  { id: 'mobilidade', label: 'Mobilidade' },
  { id: 'dor', label: 'Dor' },
  { id: 'forca', label: 'Força' },
  { id: 'capacidade_aerobia', label: 'Capacidade aeróbia' },
  { id: 'antropometria', label: 'Antropometria' },
  { id: 'prescricao', label: 'Prescrição de exercício' },
  { id: 'incapacidade', label: 'Incapacidade' },
  { id: 'quedas', label: 'Risco de quedas' },
  { id: 'encaminhamento', label: 'Encaminhamento' },
  { id: 'reabilitacao', label: 'Reabilitação' },
  { id: 'amplitude', label: 'Amplitude de movimento' },
]

const categoryById = new Map(TOOL_CATEGORIES.map((category) => [category.id, category]))
const specialtyById = new Map(TOOL_SPECIALTIES.map((item) => [item.id, item]))
const purposeById = new Map(TOOL_PURPOSES.map((item) => [item.id, item]))

export function getCategory(id: string): ToolCategory | undefined {
  return categoryById.get(id)
}

export function getSubcategory(categoryId: string, subcategoryId: string): ToolTaxon | undefined {
  return getCategory(categoryId)?.subcategories.find((item) => item.id === subcategoryId)
}

export function getSpecialty(id: string): ToolTaxon | undefined {
  return specialtyById.get(id)
}

export function getPurpose(id: string): ToolTaxon | undefined {
  return purposeById.get(id)
}
