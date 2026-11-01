export function getRecoveryWeek(startedAt: string, durationWeeks: number, now = new Date()): {
  currentWeek: number
  weekPct: number
} {
  const start = new Date(startedAt)
  const diffMs = now.getTime() - start.getTime()
  const elapsedWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  const currentWeek = Math.min(Math.max(elapsedWeeks, 1), durationWeeks)
  const weekPct = durationWeeks > 0 ? Math.round((currentWeek / durationWeeks) * 100) : 0
  return { currentWeek, weekPct }
}

export function isPatientAtRisk(input: {
  painLevel: number | null
  adherenceScore: number | null
  lastCheckInAt: string | null
  hasActivePlan: boolean
}): Array<'high_pain' | 'low_adherence' | 'missing_check_in'> {
  const reasons: Array<'high_pain' | 'low_adherence' | 'missing_check_in'> = []
  if ((input.painLevel ?? 0) >= 7) reasons.push('high_pain')
  if (input.adherenceScore != null && input.adherenceScore < 50) reasons.push('low_adherence')
  if (input.hasActivePlan) {
    if (!input.lastCheckInAt) {
      reasons.push('missing_check_in')
    } else {
      const days = (Date.now() - new Date(input.lastCheckInAt).getTime()) / (24 * 60 * 60 * 1000)
      if (days > 7) reasons.push('missing_check_in')
    }
  }
  return reasons
}
