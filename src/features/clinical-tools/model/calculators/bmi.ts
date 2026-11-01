import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, requireNumber } from '../numbers'

export const bmiFields: CalculatorField[] = [
  {
    id: 'weightKg',
    label: 'Peso',
    unit: 'kg',
    min: 20,
    max: 300,
    step: 0.1,
    required: true,
    help: 'Peso corporal atual, em quilogramas.',
    input: 'number',
  },
  {
    id: 'heightCm',
    label: 'Altura',
    unit: 'cm',
    min: 100,
    max: 250,
    step: 0.1,
    required: true,
    help: 'Altura em centímetros. Exemplo: 170.',
    input: 'number',
  },
]

export type BmiClassId =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obesity1'
  | 'obesity2'
  | 'obesity3'

const BMI_LABELS: Record<BmiClassId, string> = {
  underweight: 'Abaixo do peso',
  normal: 'Adequado',
  overweight: 'Sobrepeso',
  obesity1: 'Obesidade grau I',
  obesity2: 'Obesidade grau II',
  obesity3: 'Obesidade grau III',
}

export function bmiFromMeasures(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function classifyAdultBmi(bmi: number): BmiClassId {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  if (bmi < 35) return 'obesity1'
  if (bmi < 40) return 'obesity2'
  return 'obesity3'
}

export function adultBmiLabel(classId: BmiClassId): string {
  return BMI_LABELS[classId]
}

const ADULT_LIMITS = [
  'Os pontos de corte são os de adulto da OMS. Não se aplicam a crianças nem a adolescentes.',
  'Em idosos, gestantes, atletas e pessoas com edema ou muita massa muscular, o IMC não descreve sozinho a composição corporal nem o risco clínico.',
]

export function computeBmi(values: CalculatorValues): CalculatorOutcome {
  const weight = requireNumber(values, 'weightKg', 'o peso em kg', { min: 20, max: 300 })
  if (isFieldError(weight)) return weight
  const height = requireNumber(values, 'heightCm', 'a altura em cm', { min: 100, max: 250 })
  if (isFieldError(height)) return height

  const bmi = bmiFromMeasures(weight, height)
  const label = adultBmiLabel(classifyAdultBmi(bmi))

  return {
    lines: [
      { label: 'IMC', value: `${formatNumber(bmi, 1)} kg/m²`, detail: 'peso (kg) ÷ altura (m)²' },
      { label: 'Faixa da OMS para adulto', value: label },
    ],
    explanation:
      'O resultado é um índice de peso para a altura. A faixa segue os pontos de corte de adulto da Organização Mundial da Saúde: abaixo de 18,5; 18,5 a 24,9; 25,0 a 29,9; 30,0 a 34,9; 35,0 a 39,9; e 40,0 ou mais.',
    limitations: ADULT_LIMITS,
  }
}
