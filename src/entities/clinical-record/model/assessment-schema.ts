import type { ExamStatus } from './exam-status'
import type { VitalSigns } from './vital-signs'

/** Generic exam finding. Catalogs live in clinical-options.ts. */
export interface ExamFinding {
  status: ExamStatus
  notes: string
  /** Future catalog selections (e.g. ausculta findings, MRC muscles). */
  items: string[]
  /** Future numeric/structured values (e.g. goniometry degrees). */
  values: Record<string, number | string | null>
}

export interface YesNoDetail {
  yes: boolean | null
  detail: string
  items?: string[]
}

export interface PersonalData {
  fullName: string
  phone: string
  identityDocument: string
  dateOfBirth: string
  addressLine1: string
  addressLine2: string
  city: string
  province: string
  postalCode: string
}

export interface Anamnese {
  chiefComplaint: string
  currentIllnessHistory: string
  pastMedicalHistory: string
  medications: string
  previousSurgeries: string
}

export interface PhysicalExam {
  vitals: VitalSigns
  ausculta: ExamFinding
  mrc: ExamFinding
  goniometria: ExamFinding
  posturalChanges: ExamFinding
  gaitChanges: ExamFinding
  superficialReflexes: ExamFinding
  deepReflexes: ExamFinding
  staticBalance: ExamFinding
  dynamicBalance: ExamFinding
  specialTests: ExamFinding
}

export interface SpecificFindings {
  shorteningsDeformities: YesNoDetail
  muscleStrengthLoss: YesNoDetail
  mobilityLoss: YesNoDetail
}

export interface TherapeuticPlan {
  shortTermGoal: string
  longTermGoal: string
}

export interface AssessmentStructuredData {
  personalData: PersonalData
  anamnese: Anamnese
  physicalExam: PhysicalExam
  findings: SpecificFindings
  therapeuticPlan: TherapeuticPlan
}

export type PhysicalExamFindingKey = Exclude<keyof PhysicalExam, 'vitals'>
