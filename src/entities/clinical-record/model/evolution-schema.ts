import type { VitalSigns } from './vital-signs'

export interface EvolutionActivity {
  done: boolean
  notes: string
  /** Legacy catalog selections — kept for older records */
  items: string[]
}

export interface EvolutionStructuredData {
  vitals: VitalSigns
  /** Free-text description of what was done in the session */
  sessionConducts: string
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  performed?: EvolutionActivity
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  exercises?: EvolutionActivity
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  training?: EvolutionActivity
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  strengthening?: EvolutionActivity
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  changes?: EvolutionActivity
  /** @deprecated Prefer sessionConducts. Kept for older records. */
  conduct?: EvolutionActivity
  observations: string
}
