import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, requireNumber } from '../numbers'

export const sixMinuteWalkFields: CalculatorField[] = [
  {
    id: 'sex',
    label: 'Sexo na equação',
    required: true,
    input: 'select',
    help: 'Enright e Sherrill publicaram equações separadas.',
    options: [
      { value: 'female', label: 'Feminino' },
      { value: 'male', label: 'Masculino' },
    ],
  },
  {
    id: 'age',
    label: 'Idade',
    unit: 'anos',
    min: 18,
    max: 100,
    step: 1,
    required: true,
    help: 'A equação foi derivada em adultos saudáveis de 40 a 80 anos.',
    input: 'number',
  },
  {
    id: 'heightCm',
    label: 'Altura',
    unit: 'cm',
    min: 100,
    max: 220,
    step: 0.1,
    required: true,
    input: 'number',
  },
  {
    id: 'weightKg',
    label: 'Peso',
    unit: 'kg',
    min: 30,
    max: 250,
    step: 0.1,
    required: true,
    input: 'number',
  },
]

export interface SixMinutePrediction {
  predictedMeters: number
  lowerLimitMeters: number
  outsideDerivationAge: boolean
}

export function predictSixMinuteWalk(input: {
  sex: 'female' | 'male'
  age: number
  heightCm: number
  weightKg: number
}): SixMinutePrediction {
  const predicted =
    input.sex === 'male'
      ? 7.57 * input.heightCm - 5.02 * input.age - 1.76 * input.weightKg - 309
      : 2.11 * input.heightCm - 2.29 * input.weightKg - 5.78 * input.age + 667
  return {
    predictedMeters: predicted,
    lowerLimitMeters: predicted - 153,
    outsideDerivationAge: input.age < 40 || input.age > 80,
  }
}

export function computeSixMinuteWalk(values: CalculatorValues): CalculatorOutcome {
  const sex = values.sex
  if (sex !== 'female' && sex !== 'male') return { error: 'Escolha o sexo usado na equação.' }
  const age = requireNumber(values, 'age', 'a idade em anos', { min: 18, max: 100, integer: true })
  if (isFieldError(age)) return age
  const height = requireNumber(values, 'heightCm', 'a altura em cm', { min: 100, max: 220 })
  if (isFieldError(height)) return height
  const weight = requireNumber(values, 'weightKg', 'o peso em kg', { min: 30, max: 250 })
  if (isFieldError(weight)) return weight

  const prediction = predictSixMinuteWalk({ sex, age, heightCm: height, weightKg: weight })
  const limitations = [
    'Equação de referência de adultos saudáveis de 40 a 80 anos (Enright e Sherrill, 1998). Não é diagnóstico.',
    'O limite inferior descrito pelos autores é a distância prevista menos 153 m.',
    'Percurso, incentivo, órtese e oxigênio mudam a distância caminhada. Compare o paciente com um teste feito nas mesmas condições do statement da ATS.',
  ]
  if (prediction.outsideDerivationAge) {
    limitations.unshift('A idade está fora da faixa de 40 a 80 anos em que a equação foi derivada. O número não serve como referência para esta pessoa.')
  }

  return {
    lines: [
      {
        label: 'Distância prevista',
        value: `${formatNumber(prediction.predictedMeters, 0)} m`,
        detail: sex === 'male'
          ? '(7,57 × altura) − (5,02 × idade) − (1,76 × peso) − 309'
          : '(2,11 × altura) − (2,29 × peso) − (5,78 × idade) + 667',
      },
      {
        label: 'Limite inferior da referência',
        value: `${formatNumber(prediction.lowerLimitMeters, 0)} m`,
        detail: 'previsto − 153 m',
      },
    ],
    explanation:
      'Altura em centímetros, peso em quilogramas e idade em anos. O resultado é a distância prevista para um adulto saudável da amostra original, não a meta do tratamento.',
    limitations,
  }
}
