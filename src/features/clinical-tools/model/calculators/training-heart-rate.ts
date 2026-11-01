import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, requireNumber } from '../numbers'

export const trainingHeartRateFields: CalculatorField[] = [
  {
    id: 'method',
    label: 'Estimativa da FC máxima',
    required: true,
    input: 'select',
    help: 'Nenhuma das duas substitui um teste de esforço.',
    options: [
      { value: 'tanaka', label: 'Tanaka: 208 − (0,7 × idade)' },
      { value: 'fox', label: '220 − idade' },
    ],
  },
  {
    id: 'age',
    label: 'Idade',
    unit: 'anos',
    min: 18,
    max: 90,
    step: 1,
    required: true,
    help: 'A equação de Tanaka foi estudada em adultos.',
    input: 'number',
  },
  {
    id: 'restingHr',
    label: 'FC de repouso',
    unit: 'bpm',
    min: 30,
    max: 150,
    step: 1,
    required: true,
    help: 'Medida em repouso, em batimentos por minuto.',
    input: 'number',
  },
  {
    id: 'zone',
    label: 'Intensidade pela reserva (FCR)',
    required: true,
    input: 'select',
    help: 'Faixas de percentual da frequência cardíaca de reserva, conforme o position stand do ACSM (Garber e colaboradores, 2011).',
    options: [
      { value: 'very_light', label: 'Muito leve: abaixo de 30%' },
      { value: 'light', label: 'Leve: 30% a 39%' },
      { value: 'moderate', label: 'Moderada: 40% a 59%' },
      { value: 'vigorous', label: 'Vigorosa: 60% a 89%' },
      { value: 'near_max', label: 'Próxima do máximo: 90% ou mais' },
      { value: 'custom', label: 'Percentual informado' },
    ],
  },
  {
    id: 'intensity',
    label: 'Percentual da reserva',
    unit: '%',
    min: 1,
    max: 100,
    step: 1,
    required: true,
    help: 'Usado somente na opção percentual informado.',
    input: 'number',
    visibleWhen: { id: 'zone', value: 'custom' },
  },
]

export type HrMaxMethod = 'tanaka' | 'fox'

export function estimateMaxHeartRate(age: number, method: HrMaxMethod): number {
  if (method === 'tanaka') return 208 - 0.7 * age
  return 220 - age
}

export function karvonenTarget(hrMax: number, restingHr: number, percent: number): number {
  const reserve = hrMax - restingHr
  return restingHr + reserve * (percent / 100)
}

const ZONE_RANGE: Record<string, { low: number | null; high: number | null; name: string }> = {
  very_light: { low: null, high: 30, name: 'muito leve' },
  light: { low: 30, high: 39, name: 'leve' },
  moderate: { low: 40, high: 59, name: 'moderada' },
  vigorous: { low: 60, high: 89, name: 'vigorosa' },
  near_max: { low: 90, high: null, name: 'próxima do máximo' },
}

export function computeTrainingHeartRate(values: CalculatorValues): CalculatorOutcome {
  const method = values.method
  if (method !== 'tanaka' && method !== 'fox') {
    return { error: 'Escolha a equação da frequência cardíaca máxima.' }
  }
  const age = requireNumber(values, 'age', 'a idade em anos', { min: 18, max: 90, integer: true })
  if (isFieldError(age)) return age
  const restingHr = requireNumber(values, 'restingHr', 'a FC de repouso em bpm', {
    min: 30,
    max: 150,
    integer: true,
  })
  if (isFieldError(restingHr)) return restingHr

  const hrMax = estimateMaxHeartRate(age, method)
  if (restingHr >= hrMax) {
    return { error: 'A FC de repouso precisa ser menor do que a FC máxima estimada.' }
  }

  const methodName = method === 'tanaka' ? 'Tanaka, 2001' : '220 − idade'
  const lines = [
    {
      label: 'FC máxima estimada',
      value: `${formatNumber(hrMax, 0)} bpm`,
      detail: methodName,
    },
  ]

  const zone = values.zone
  if (!zone) return { error: 'Escolha a faixa de intensidade.' }

  const limitations = [
    'A FC máxima estimada tem erro individual. Ela não substitui um teste máximo nem a avaliação clínica.',
    'A fórmula 220 − idade tende a errar mais e, em adultos mais velhos, costuma ficar abaixo da equação de Tanaka.',
    'Medicação, arritmia, descondicionamento e sintomas mudam a leitura da frequência. Não prescreva só por este número.',
  ]

  if (zone === 'custom') {
    const intensity = requireNumber(values, 'intensity', 'o percentual da reserva', {
      min: 1,
      max: 100,
      integer: true,
    })
    if (isFieldError(intensity)) return intensity
    const target = karvonenTarget(hrMax, restingHr, intensity)
    lines.push({
      label: `FC alvo a ${formatNumber(intensity, 0)}% da reserva`,
      value: `${formatNumber(target, 0)} bpm`,
      detail: 'FC repouso + (FC máxima − FC repouso) × percentual',
    })
    return {
      lines,
      explanation:
        'O alvo usa a reserva cardíaca de Karvonen: soma-se à FC de repouso a fração escolhida da diferença entre a FC máxima estimada e a de repouso.',
      limitations,
    }
  }

  const range = ZONE_RANGE[zone]
  if (!range) return { error: 'Escolha a faixa de intensidade.' }

  if (range.low != null && range.high != null) {
    const low = karvonenTarget(hrMax, restingHr, range.low)
    const high = karvonenTarget(hrMax, restingHr, range.high)
    lines.push({
      label: `Faixa ${range.name}`,
      value: `${formatNumber(low, 0)}–${formatNumber(high, 0)} bpm`,
      detail: `${range.low}% a ${range.high}% da reserva`,
    })
  } else if (range.high != null) {
    const ceiling = karvonenTarget(hrMax, restingHr, range.high)
    lines.push({
      label: `Teto da faixa ${range.name}`,
      value: `${formatNumber(ceiling, 0)} bpm`,
      detail: 'Corresponde a 30% da reserva. A faixa muito leve fica abaixo deste valor.',
    })
  } else if (range.low != null) {
    const floor = karvonenTarget(hrMax, restingHr, range.low)
    lines.push({
      label: `Piso da faixa ${range.name}`,
      value: `${formatNumber(floor, 0)} bpm`,
      detail: 'Corresponde a 90% da reserva. O teto seria a FC máxima estimada, que não é meta de treino por esta ficha.',
    })
  }

  return {
    lines,
    explanation:
      'As faixas de percentual da reserva seguem a classificação do position stand do American College of Sports Medicine (Garber e colaboradores, 2011). O cálculo da meta é o de Karvonen.',
    limitations,
  }
}
