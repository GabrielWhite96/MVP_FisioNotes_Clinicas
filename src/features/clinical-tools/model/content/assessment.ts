import { GONIOMETRY_JOINTS, MRC_MUSCLE_GROUPS } from '@/entities/clinical-record/model/clinical-options'
import type { ClinicalTool } from '../types'

export const assessmentTools: ClinicalTool[] = [
  {
    id: 'goniometria',
    slug: 'goniometria',
    kind: 'physical_assessment',
    name: 'Roteiro de goniometria',
    shortDescription: 'Como registrar a amplitude, sem tabela de graus copiada de manual.',
    purpose: 'Padronizar o registro da amplitude articular com os mesmos nomes de articulação do prontuário.',
    categoryId: 'physical_assessment',
    subcategoryId: 'goniometria',
    specialties: ['musculoesqueletica', 'ortopedia', 'neurologia'],
    bodyRegions: ['Corpo inteiro'],
    clinicalPurposes: ['amplitude'],
    searchTerms: ['goniometria', 'amplitude', 'adm', 'grau', 'goniômetro'],
    reviewStatus: 'professional_guidance',
    populations: ['Pessoas em que o segmento pode ser posicionado e o movimento, explicado.'],
    limitations: [
      'Faixas de referência dependem da fonte, da idade e do método. Nenhuma tabela de “normal” entra nesta ficha.',
      'O posicionamento específico de cada articulação está no manual de goniometria, não aqui.',
    ],
    license: {
      status: 'product_original',
      notes: 'Roteiro autoral. O manual de Norkin e White é a referência para o alinhamento de cada articulação e não é reproduzido.',
    },
    professionalJudgment: true,
    relatedToolIds: ['escala-mrc', 'forca-muscular-mrc'],
    sources: [
      {
        type: 'textbook',
        citation: 'Norkin CC, White DJ. Measurement of Joint Motion: A Guide to Goniometry. Philadelphia: F.A. Davis.',
        year: 2016,
      },
    ],
    materials: ['Goniômetro', 'Acesso ao segmento, com a roupa afastada da articulação'],
    steps: [
      'Explique o movimento e peça que a pessoa avise se doer.',
      'Compare com o outro lado quando ele puder servir de referência daquela pessoa.',
      'Estabilize o segmento proximal e alinhe o eixo e os braços do goniômetro como o manual descreve para aquela articulação.',
      'Meça o movimento ativo. Se medir também o passivo, registre os dois separadamente.',
      'Anote graus, lado, movimento e se foi ativo ou passivo.',
    ],
    interpretation: `Articulações já nomeadas no prontuário: ${GONIOMETRY_JOINTS.join(', ')}. Use esses nomes para o registro conversar com a avaliação.`,
  },
  {
    id: 'forca-muscular-mrc',
    slug: 'forca-muscular-mrc',
    kind: 'physical_assessment',
    name: 'Força muscular pela escala MRC',
    shortDescription: 'Como aplicar os graus 0 a 5 nos grupos que o prontuário já lista.',
    purpose: 'Conduzir o teste manual de força com a escala MRC e os grupos musculares do prontuário.',
    categoryId: 'physical_assessment',
    subcategoryId: 'forca',
    specialties: ['neurologia', 'musculoesqueletica', 'geriatria'],
    bodyRegions: ['Corpo inteiro'],
    clinicalPurposes: ['forca'],
    searchTerms: ['força', 'mrc', 'teste manual', 'grau'],
    reviewStatus: 'verified',
    populations: ['Pessoas que compreendem o comando de empurrar ou de sustentar o segmento.'],
    limitations: [
      'Dor e amplitude limitada reduzem o grau sem que isso seja, sozinho, fraqueza.',
      'Não converta a soma dos graus em um índice: a escala é ordinal.',
    ],
    license: {
      status: 'free_clinical_use',
      notes: 'As definições dos graus estão na ficha da escala MRC. Este roteiro só organiza a aplicação.',
    },
    professionalJudgment: true,
    relatedToolIds: ['escala-mrc', 'goniometria', 'um-rm-brzycki'],
    sources: [
      {
        type: 'institution',
        citation: 'Medical Research Council. Aids to the examination of the peripheral nervous system. Memorandum no. 45. London: Her Majesty’s Stationery Office; 1976.',
        year: 1976,
      },
    ],
    positioning: 'Posicione o segmento de modo que a gravidade ajude a distinguir os graus 2 e 3. O grau 2 é movimento com a gravidade eliminada; o grau 3 é movimento contra a gravidade.',
    steps: [
      'Explique que a pessoa deve fazer força no sentido pedido.',
      'Observe primeiro se há contração (graus 0 e 1) e se há movimento sem e com gravidade (graus 2 e 3).',
      'Só então aplique resistência para separar os graus 4 e 5.',
      'Registre grupo, lado e grau. Não use 4+ ou 4− se quiser manter a escala original.',
    ],
    interpretation: `Grupos já nomeados no prontuário: ${MRC_MUSCLE_GROUPS.join(', ')}. A definição de cada grau está na escala MRC.`,
  },
]
