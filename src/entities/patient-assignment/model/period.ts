export type AssignmentPeriod = {
  startedOn: string
  endedOn: string | null
}

/** Inclusive civil-date overlap: started_on <= to AND (ended_on IS NULL OR ended_on >= from). */
export function assignmentOverlapsPeriod(
  assignment: AssignmentPeriod,
  from: string | null,
  to: string | null,
): boolean {
  if (to && assignment.startedOn > to) return false
  if (from && assignment.endedOn && assignment.endedOn < from) return false
  return true
}

export function filterAssignmentsByPeriod<T extends AssignmentPeriod>(
  assignments: T[],
  from: string | null,
  to: string | null,
): T[] {
  return assignments.filter((item) => assignmentOverlapsPeriod(item, from, to))
}

export function daysAgoIso(days: number, now = new Date()): string {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}
