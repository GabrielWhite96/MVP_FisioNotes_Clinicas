import type { CalculatorField, CalculatorOutcome, CalculatorValues } from '../types'
import { formatNumber, isFieldError, requireNumber } from '../numbers'

export const nprsFields: CalculatorField[] = [
  {
    id: 'score',
    label: 'Pontuação relatada',
    unit: '0 a 10',
    min: 0,
    max: 10,
    step: 1,
    required: true,
    help: '0 é ausência de dor. 10 é a pior dor imaginável.',
    input: 'number',
  },
]

export function computeNprs(values: CalculatorValues): CalculatorOutcome {
  const score = requireNumber(values, 'score', 'a pontuação de 0 a 10', { min: 0, max: 10, integer: true })
  if (isFieldError(score)) return score

  return {
    lines: [
      { label: 'NPRS', value: `${formatNumber(score, 0)} de 10` },
    ],
    explanation:
      'A escala numérica registra a intensidade que a pessoa atribui à dor. Uma mudança de 2 pontos foi descrita como diferença clínica importante em pessoas com dor lombar (Childs, Piva e Fritz, 2005). Esta ficha não classifica a dor em leve, moderada ou intensa: esses cortes mudam conforme a condição e o estudo.',
    limitations: [
      'É autorrelato. Não identifica a causa da dor nem autoriza ou suspende um tratamento sozinha.',
      'O ponto de 2 vale para a população do estudo citado, não para qualquer quadro.',
    ],
  }
}

export const MRC_GRADE_TEXT: Record<string, string> = {
  '0': 'Nenhuma contração visível.',
  '1': 'Esboço de contração, sem movimento do segmento.',
  '2': 'Movimento ativo com a gravidade eliminada, em toda a amplitude disponível.',
  '3': 'Movimento ativo contra a gravidade, em toda a amplitude disponível.',
  '4': 'Movimento ativo contra a gravidade e alguma resistência. O grau é amplo e depende do examinador.',
  '5': 'Força considerada normal, contra resistência plena.',
}

export const mrcFields: CalculatorField[] = [
  {
    id: 'grade',
    label: 'Grau observado',
    required: true,
    input: 'select',
    help: 'Escala ordinal de 0 a 5. Graus intermediários com sinal de mais ou menos não fazem parte da definição original.',
    options: [0, 1, 2, 3, 4, 5].map((grade) => ({
      value: String(grade),
      label: `${grade} — ${MRC_GRADE_TEXT[String(grade)]}`,
    })),
  },
]

export function computeMrc(values: CalculatorValues): CalculatorOutcome {
  const grade = values.grade
  const text = grade ? MRC_GRADE_TEXT[grade] : undefined
  if (!text) return { error: 'Escolha o grau de 0 a 5.' }

  return {
    lines: [
      { label: 'Grau MRC', value: grade, detail: text },
    ],
    explanation:
      'A escala do Medical Research Council gradua a força de um grupo muscular. Os números não são intervalos iguais: a diferença entre 3 e 4 não é a mesma que entre 4 e 5.',
    limitations: [
      'O grau 4 concentra muita variação. Compare o mesmo grupo, do mesmo lado, com o mesmo examinador.',
      'Dor, compreensão do comando e amplitude articular limitada mudam o grau sem que a força do músculo seja a única explicação.',
    ],
  }
}
