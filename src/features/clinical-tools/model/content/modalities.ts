import type { ClinicalTool } from '../types'

const modalityLimits = [
  'Esta ficha não traz tempo, temperatura nem intensidade. Não há um parâmetro único que sirva a todos os quadros e equipamentos.',
  'A lista resume uma revisão e não substitui o manual do recurso nem a avaliação da pessoa.',
]

export const modalityTools: ClinicalTool[] = [
  {
    id: 'crioterapia',
    slug: 'crioterapia',
    kind: 'therapeutic_modality',
    name: 'Crioterapia',
    shortDescription: 'Frio superficial para dor aguda de partes moles, com contraindicações da revisão citada.',
    purpose: 'Reunir indicações e situações em que a revisão recomenda evitar o frio, sem fixar dose.',
    categoryId: 'therapeutic_resources',
    subcategoryId: 'crioterapia',
    specialties: ['musculoesqueletica', 'esportiva', 'ortopedia'],
    bodyRegions: ['Corpo inteiro'],
    clinicalPurposes: ['dor', 'reabilitacao'],
    searchTerms: ['gelo', 'frio', 'crioterapia', 'edema'],
    reviewStatus: 'verified',
    populations: ['Pessoas sem contraindicação ao frio, em lesão aguda de partes moles ou dor musculoesquelética, conforme a revisão.'],
    limitations: modalityLimits,
    license: {
      status: 'public_knowledge',
      notes: 'Resumo da revisão de Nadler, Weingand e Kruse (2004). Não copia o artigo.',
    },
    professionalJudgment: true,
    relatedToolIds: ['termoterapia-superficial', 'police-entorse-tornozelo'],
    sources: [
      {
        type: 'original_article',
        citation: 'Nadler SF, Weingand K, Kruse RJ. The physiologic basis and clinical applications of cryotherapy and thermotherapy for the pain practitioner. Pain Physician. 2004;7(3):395-399.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16858479/',
        year: 2004,
      },
    ],
    indications: [
      'A revisão discute o frio para dor e para lesão aguda de partes moles.',
    ],
    contraindications: [
      'Hipersensibilidade ao frio ou urticária ao frio.',
      'Fenômeno de Raynaud.',
      'Crioglobulinemia ou hemoglobinúria paroxística ao frio.',
      'Área com circulação arterial comprometida.',
      'Sobre nervo periférico em regeneração.',
    ],
    parameterNote: 'Tempo, temperatura e modo de aplicação ficam de fora. Dependem do método, da região e da resposta da pessoa, e a revisão não estabelece uma dose única.',
    interpretation: 'Sensibilidade alterada, ferida aberta e dificuldade de comunicar desconforto são motivos para redobrar o cuidado ou não aplicar, mesmo quando não estão na lista principal de contraindicações.',
  },
  {
    id: 'termoterapia-superficial',
    slug: 'termoterapia-superficial',
    kind: 'therapeutic_modality',
    name: 'Termoterapia superficial',
    shortDescription: 'Calor superficial para dor e espasmo, fora da fase aguda. Sem dose.',
    purpose: 'Reunir o uso do calor superficial e as situações em que a revisão recomenda evitá-lo.',
    categoryId: 'therapeutic_resources',
    subcategoryId: 'termoterapia',
    specialties: ['musculoesqueletica', 'ortopedia'],
    bodyRegions: ['Corpo inteiro'],
    clinicalPurposes: ['dor', 'reabilitacao'],
    searchTerms: ['calor', 'termoterapia', 'bolsa', 'espasmo'],
    reviewStatus: 'verified',
    populations: ['Pessoas com dor ou espasmo muscular fora da fase aguda, sem as contraindicações listadas.'],
    limitations: modalityLimits,
    license: {
      status: 'public_knowledge',
      notes: 'Resumo da mesma revisão citada na crioterapia.',
    },
    professionalJudgment: true,
    relatedToolIds: ['crioterapia'],
    sources: [
      {
        type: 'original_article',
        citation: 'Nadler SF, Weingand K, Kruse RJ. The physiologic basis and clinical applications of cryotherapy and thermotherapy for the pain practitioner. Pain Physician. 2004;7(3):395-399.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16858479/',
        year: 2004,
      },
    ],
    indications: [
      'A revisão discute o calor superficial para dor, espasmo muscular e para preparar o tecido antes do alongamento.',
    ],
    contraindications: [
      'Lesão ou inflamação aguda.',
      'Hemorragia ou distúrbio hemorrágico.',
      'Trombose ou tromboflebite na região.',
      'Malignidade na área de aplicação.',
      'Sensibilidade alterada que impeça a pessoa de perceber calor excessivo.',
    ],
    parameterNote: 'Não há temperatura nem tempo nesta ficha. O calor superficial não alcança tecidos profundos da mesma forma que recursos destinados a isso, e a dose depende do método.',
    interpretation: 'Na lesão aguda, o calor não é a escolha descrita pela revisão. Confirme se a pessoa consegue relatar desconforto.',
  },
]
