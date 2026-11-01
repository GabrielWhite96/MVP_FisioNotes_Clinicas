import type { ExamFinding, AssessmentStructuredData } from './assessment-schema'
import type { EvolutionStructuredData } from './evolution-schema'
import { EMPTY_VITAL_SIGNS } from './vital-signs'

export function emptyExamFinding(): ExamFinding {
  return {
    status: 'nao_avaliado',
    notes: '',
    items: [],
    values: {},
  }
}

export function emptyAssessmentData(
  prefill?: Partial<AssessmentStructuredData['personalData']>
): AssessmentStructuredData {
  return {
    personalData: {
      fullName: prefill?.fullName ?? '',
      phone: prefill?.phone ?? '',
      identityDocument: prefill?.identityDocument ?? '',
      dateOfBirth: prefill?.dateOfBirth ?? '',
      addressLine1: prefill?.addressLine1 ?? '',
      addressLine2: prefill?.addressLine2 ?? '',
      city: prefill?.city ?? '',
      province: prefill?.province ?? '',
      postalCode: prefill?.postalCode ?? '',
    },
    anamnese: {
      chiefComplaint: '',
      currentIllnessHistory: '',
      pastMedicalHistory: '',
      medications: '',
      previousSurgeries: '',
    },
    physicalExam: {
      vitals: { ...EMPTY_VITAL_SIGNS },
      ausculta: emptyExamFinding(),
      mrc: emptyExamFinding(),
      goniometria: emptyExamFinding(),
      posturalChanges: emptyExamFinding(),
      gaitChanges: emptyExamFinding(),
      superficialReflexes: emptyExamFinding(),
      deepReflexes: emptyExamFinding(),
      staticBalance: emptyExamFinding(),
      dynamicBalance: emptyExamFinding(),
      specialTests: emptyExamFinding(),
    },
    findings: {
      shorteningsDeformities: { yes: null, detail: '', items: [] },
      muscleStrengthLoss: { yes: null, detail: '', items: [] },
      mobilityLoss: { yes: null, detail: '', items: [] },
    },
    therapeuticPlan: {
      shortTermGoal: '',
      longTermGoal: '',
    },
  }
}

export function emptyEvolutionData(): EvolutionStructuredData {
  return {
    vitals: { ...EMPTY_VITAL_SIGNS },
    sessionConducts: '',
    observations: '',
  }
}
