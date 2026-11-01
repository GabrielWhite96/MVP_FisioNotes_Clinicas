import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, parseFieldNumber, requireNumber } from '../numbers'

export const waistFields: CalculatorField[] = [
  {
    id: 'sex',
    label: 'Sexo usado nos pontos de corte',
    required: true,
    input: 'select',
    help: 'A consulta da OMS publicou limiares separados para homens e mulheres.',
    options: [
      { value: 'female', label: 'Feminino' },
      { value: 'male', label: 'Masculino' },
    ],
  },
  {
    id: 'waistCm',
    label: 'Circunferência da cintura',
    unit: 'cm',
    min: 40,
    max: 200,
    step: 0.1,
    required: true,
    help: 'Ponto médio entre a última costela e a crista ilíaca, ao final de uma expiração normal, como orienta a OMS.',
    input: 'number',
  },
  {
    id: 'hipCm',
    label: 'Circunferência do quadril',
    unit: 'cm',
    min: 40,
    max: 200,
    step: 0.1,
    required: false,
    help: 'Opcional. No ponto de maior circunferência dos glúteos. Se preenchida, a relação cintura-quadril também é calculada.',
    input: 'number',
  },
]

export type RiskBand = 'below' | 'increased' | 'substantially_increased'

const BAND_LABEL: Record<RiskBand, string> = {
  below: 'Abaixo do limiar de risco aumentado',
  increased: 'Risco aumentado',
  substantially_increased: 'Risco substancialmente aumentado',
}

export function classifyWaist(sex: 'female' | 'male', waistCm: number): RiskBand {
  if (sex === 'female') {
    if (waistCm >= 88) return 'substantially_increased'
    if (waistCm >= 80) return 'increased'
    return 'below'
  }
  if (waistCm >= 102) return 'substantially_increased'
  if (waistCm >= 94) return 'increased'
  return 'below'
}

export function waistHipRatio(waistCm: number, hipCm: number): number {
  return waistCm / hipCm
}

export function classifyWaistHip(sex: 'female' | 'male', ratio: number): RiskBand {
  const cutoff = sex === 'female' ? 0.85 : 0.9
  return ratio >= cutoff ? 'substantially_increased' : 'below'
}

const LIMITS = [
  'Os limiares da OMS (2011) foram obtidos sobretudo em adultos caucasianos. Outras populações podem precisar de pontos de corte próprios.',
  'Não use estes números em crianças. Gravidez, distensão abdominal e a técnica da fita mudam a medida.',
  'A relação cintura-quadril, quando calculada, usa o limiar de risco substancialmente aumentado da mesma consulta: 0,85 para mulheres e 0,90 para homens.',
]

export function computeWaist(values: CalculatorValues): CalculatorOutcome {
  const sex = values.sex
  if (sex !== 'female' && sex !== 'male') return { error: 'Escolha o sexo usado nos pontos de corte.' }
  const waist = requireNumber(values, 'waistCm', 'a circunferência da cintura em cm', { min: 40, max: 200 })
  if (isFieldError(waist)) return waist

  const sexLabel = sex === 'female' ? 'mulheres' : 'homens'
  const lines = [
    {
      label: 'Cintura',
      value: `${formatNumber(waist, 1)} cm`,
      detail: BAND_LABEL[classifyWaist(sex, waist)],
    },
  ]

  const hipRaw = values.hipCm?.trim()
  if (hipRaw) {
    const hip = parseFieldNumber(hipRaw)
    if (hip == null || hip < 40 || hip > 200) {
      return { error: 'A circunferência do quadril deve ficar entre 40 e 200 cm, ou fique em branco.' }
    }
    const ratio = waistHipRatio(waist, hip)
    const cutoff = sex === 'female' ? '0,85' : '0,90'
    lines.push({
      label: 'Relação cintura-quadril',
      value: formatNumber(ratio, 2),
      detail: `${BAND_LABEL[classifyWaistHip(sex, ratio)]} para ${sexLabel} (limiar ${cutoff})`,
    })
  }

  return {
    lines,
    explanation:
      'A cintura usa os limiares da consulta de especialistas da OMS: mulheres, risco aumentado a partir de 80 cm e substancialmente aumentado a partir de 88 cm; homens, 94 cm e 102 cm. A relação, se houver quadril, é cintura ÷ quadril.',
    limitations: LIMITS,
  }
}
