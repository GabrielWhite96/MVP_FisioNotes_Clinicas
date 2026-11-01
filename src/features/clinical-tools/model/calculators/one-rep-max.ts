import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, requireNumber } from '../numbers'

export const oneRepMaxFields: CalculatorField[] = [
  {
    id: 'weightKg',
    label: 'Carga da série',
    unit: 'kg',
    min: 1,
    max: 500,
    step: 0.5,
    required: true,
    help: 'Carga levantada com a técnica que se quer estimar.',
    input: 'number',
  },
  {
    id: 'reps',
    label: 'Repetições até a fadiga',
    unit: 'reps',
    min: 1,
    max: 10,
    step: 1,
    required: true,
    help: 'A equação de Brzycki é usada aqui apenas de 1 a 10 repetições.',
    input: 'number',
  },
]

export function brzyckiOneRepMax(weightKg: number, reps: number): number {
  return (weightKg * 36) / (37 - reps)
}

export function computeOneRepMax(values: CalculatorValues): CalculatorOutcome {
  const weight = requireNumber(values, 'weightKg', 'a carga em kg', { min: 1, max: 500 })
  if (isFieldError(weight)) return weight
  const reps = requireNumber(values, 'reps', 'as repetições', { min: 1, max: 10, integer: true })
  if (isFieldError(reps)) return reps

  const estimated = brzyckiOneRepMax(weight, reps)

  return {
    lines: [
      {
        label: '1RM estimado',
        value: `${formatNumber(estimated, 1)} kg`,
        detail: 'carga × 36 ÷ (37 − repetições)',
      },
    ],
    explanation:
      'A equação de Brzycki (1993) estima a carga de uma repetição máxima a partir de uma série submáxima. Com 1 repetição, o resultado é a própria carga.',
    limitations: [
      'Acima de 10 repetições esta ficha não calcula: o erro da estimativa cresce.',
      'Dor, tempo de execução, amplitude incompleta e falta de familiaridade com o exercício alteram o número. Não é prescrição de carga.',
      'A equação não foi feita como teste clínico para pessoas em reabilitação com dor limitando as repetições.',
    ],
  }
}
