export type ExamStatus = 'sem_alteracao' | 'com_alteracao' | 'nao_avaliado'

export const EXAM_STATUS_OPTIONS: Array<{ value: ExamStatus; label: string }> = [
  { value: 'nao_avaliado', label: 'Não avaliado' },
  { value: 'sem_alteracao', label: 'Sem alteração' },
  { value: 'com_alteracao', label: 'Com alteração' },
]
