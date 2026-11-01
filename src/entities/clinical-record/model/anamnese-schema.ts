import type { Anamnese } from './assessment-schema'

export interface AnamneseStructuredData {
  anamnese: Anamnese
}

export function emptyAnamneseData(): AnamneseStructuredData {
  return {
    anamnese: {
      chiefComplaint: '',
      currentIllnessHistory: '',
      pastMedicalHistory: '',
      medications: '',
      previousSurgeries: '',
    },
  }
}

export function summarizeAnamnese(data: AnamneseStructuredData): string {
  const { anamnese } = data
  const lines: string[] = []
  if (anamnese.chiefComplaint) lines.push(`Queixa: ${anamnese.chiefComplaint}`)
  if (anamnese.currentIllnessHistory) lines.push(`HDA: ${anamnese.currentIllnessHistory}`)
  if (anamnese.pastMedicalHistory) lines.push(`HPP: ${anamnese.pastMedicalHistory}`)
  if (anamnese.medications) lines.push(`Medicações: ${anamnese.medications}`)
  if (anamnese.previousSurgeries) lines.push(`Cirurgias: ${anamnese.previousSurgeries}`)
  return lines.join('\n')
}
