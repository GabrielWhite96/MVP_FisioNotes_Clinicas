import type { ClinicalTool } from '../types'

export const referenceTools: ClinicalTool[] = [
  {
    id: 'red-flags-lombar',
    slug: 'red-flags-lombar',
    kind: 'clinical_reference',
    name: 'Sinais de alerta na dor lombar',
    shortDescription: 'Quando pensar em encaminhamento, e por que um sinal isolado quase nunca fecha o diagnóstico.',
    purpose: 'Apoiar a decisão de encaminhar pessoa com dor lombar diante de sinais de alerta, sem transformar a lista em um escore.',
    categoryId: 'clinical_references',
    subcategoryId: 'sinais-de-alerta',
    specialties: ['musculoesqueletica', 'ortopedia'],
    bodyRegions: ['Coluna lombar'],
    clinicalPurposes: ['encaminhamento', 'dor', 'triagem'],
    searchTerms: ['red flag', 'cauda equina', 'câncer', 'fratura', 'lombar', 'alerta'],
    reviewStatus: 'verified',
    populations: ['Adultos com dor lombar. A diretriz NICE citada aplica-se a pessoas com mais de 16 anos.'],
    limitations: [
      'A revisão de Downie e colaboradores (2013) mostrou que a maioria dos sinais de alerta, isoladamente, tem acurácia ruim para câncer e para fratura.',
      'Esta ficha não calcula probabilidade nem substitui avaliação médica de urgência.',
    ],
    license: {
      status: 'public_knowledge',
      notes: 'Resumo das fontes citadas. Não é um instrumento com pontuação.',
    },
    professionalJudgment: true,
    relatedToolIds: ['dor-lombar', 'oswestry', 'nprs'],
    sources: [
      {
        type: 'systematic_review',
        citation: 'Downie A, Williams CM, Henschke N, et al. Red flags to screen for malignancy and fracture in patients with low back pain: systematic review. BMJ. 2013;347:f7095.',
        url: 'https://doi.org/10.1136/bmj.f7095',
        year: 2013,
      },
      {
        type: 'guideline',
        citation: 'National Institute for Health and Care Excellence. Low back pain and sciatica in over 16s: assessment and management. NICE guideline NG59.',
        url: 'https://www.nice.org.uk/guidance/ng59',
        year: 2016,
      },
    ],
    indications: [
      'Encaminhamento imediato para suspeita de cauda equina, conforme a NG59: alteração recente de esfíncteres, anestesia em sela, déficit neurológico grave ou progressivo nas pernas, inclusive bilateral, ou ciática bilateral.',
      'Considerar patologia grave, sem fechar diagnóstico, diante de história de câncer, perda de peso inexplicada, febre, imunossupressão, uso de droga injetável, trauma importante ou trauma menor em pessoa idosa ou em uso prolongado de corticoide.',
    ],
    interpretation: 'História de câncer foi um dos poucos sinais com alguma utilidade para malignidade na revisão de Downie, e ainda assim insuficiente para confirmar a doença. Combine o quadro, não some itens como se fossem um teste validado.',
  },
]
