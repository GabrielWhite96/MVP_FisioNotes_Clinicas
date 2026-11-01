export interface VitalSigns {
  hr: number | null
  rr: number | null
  spo2: number | null
  bpSystolic: number | null
  bpDiastolic: number | null
  temperature: number | null
}

export const EMPTY_VITAL_SIGNS: VitalSigns = {
  hr: null,
  rr: null,
  spo2: null,
  bpSystolic: null,
  bpDiastolic: null,
  temperature: null,
}
