import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import {
  createAppointmentsBatch,
  getStaffBusyIntervals,
} from '@/entities/appointment/api/appointment-api'
import {
  WEEKDAY_SHORT,
  addDaysIso,
  expandWeeklySchedule,
  findSlotConflicts,
  localIsoDate,
  type WeeklySeries,
} from '@/entities/appointment/model/bulk-schedule'
import { listClinicPhysiotherapists } from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { getPhysioOwnedPatients } from '@/entities/patient/api/patient-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingSpinner } from '@/shared/ui/states'
import { MODALITY_LABELS, ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { formatDate, generateTimeSlots } from '@/shared/lib/dates'
import type { AppointmentModality } from '@/shared/types/database'
import { cn } from '@/shared/lib/utils'

function newSeries(): WeeklySeries {
  return {
    id: crypto.randomUUID(),
    clinicPhysiotherapistId: '',
    weekdays: [],
    time: '09:00',
    durationMinutes: 60,
  }
}

const TIME_OPTIONS = generateTimeSlots('07:00', '21:00', 30)

export function ClinicBulkScheduleForm({
  practiceId,
  preselectedPatientId,
}: {
  practiceId: string
  preselectedPatientId?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [patientId, setPatientId] = useState(preselectedPatientId ?? '')
  const [modality, setModality] = useState<AppointmentModality>('telehealth')
  const [fromDate, setFromDate] = useState(localIsoDate())
  const [toDate, setToDate] = useState(addDaysIso(localIsoDate(), 27))
  const [notes, setNotes] = useState('')
  const [series, setSeries] = useState<WeeklySeries[]>([newSeries()])

  const patientsQuery = useQuery({
    queryKey: queryKeys.physioPatients(practiceId),
    queryFn: () => getPhysioOwnedPatients(practiceId),
  })
  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapists(practiceId),
    queryFn: () => listClinicPhysiotherapists(practiceId, { activeOnly: true }),
    enabled: !!practiceId,
  })

  const proposed = useMemo(
    () => expandWeeklySchedule(fromDate, toDate, series),
    [fromDate, toDate, series],
  )
  const staffIds = [...new Set(proposed.map((slot) => slot.clinicPhysiotherapistId))]

  const busyQuery = useQuery({
    queryKey: ['staff-busy', staffIds.join(','), fromDate, toDate],
    queryFn: () => getStaffBusyIntervals(staffIds, fromDate, toDate),
    enabled: staffIds.length > 0 && !!fromDate && !!toDate,
  })

  const conflicts = useMemo(
    () => findSlotConflicts(proposed, busyQuery.data ?? []),
    [proposed, busyQuery.data],
  )
  const conflictKeys = new Set(conflicts.map((item) => `${item.slot.seriesId}-${item.slot.scheduledAt.toISOString()}`))
  const staffById = new Map((staffQuery.data ?? []).map((staff) => [staff.id, staff.full_name]))

  const updateSeries = (id: string, patch: Partial<WeeklySeries>) => {
    setSeries((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const toggleWeekday = (id: string, weekday: number) => {
    setSeries((current) => current.map((item) => {
      if (item.id !== id) return item
      const weekdays = item.weekdays.includes(weekday)
        ? item.weekdays.filter((value) => value !== weekday)
        : [...item.weekdays, weekday].sort((a, b) => a - b)
      return { ...item, weekdays }
    }))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (conflicts.length) {
        throw new Error(pt.clinic.scheduleHasConflicts)
      }
      return createAppointmentsBatch({
        practiceId,
        patientId,
        modality,
        notes: notes || undefined,
        items: proposed.map((slot) => ({
          clinicPhysiotherapistId: slot.clinicPhysiotherapistId,
          scheduledAt: slot.scheduledAt.toISOString(),
          durationMinutes: slot.durationMinutes,
        })),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientAttendance(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientBilling(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.physioBillingOverview(practiceId) })
      navigate(ROUTES.physio.patient(patientId))
    },
  })

  if (patientsQuery.isLoading || staffQuery.isLoading) return <LoadingSpinner />

  const staff = staffQuery.data ?? []
  const canSubmit = !!patientId && proposed.length > 0 && conflicts.length === 0 && staff.length > 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{pt.clinic.bulkScheduleTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.bulkScheduleHint}</p>
          {!staff.length && (
            <p className="text-sm text-red-600">{pt.clinic.noStaffForSchedule}</p>
          )}
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={!!preselectedPatientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
              <SelectContent>
                {(patientsQuery.data ?? []).map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>{patient.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select value={modality} onValueChange={(value) => setModality(value as AppointmentModality)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MODALITY_LABELS) as AppointmentModality[]).map((item) => (
                  <SelectItem key={item} value={item}>{MODALITY_LABELS[item]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{pt.clinic.periodFrom}</Label>
              <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{pt.clinic.periodTo}</Label>
              <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>

          {series.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{pt.clinic.seriesLabel} {index + 1}</p>
                {series.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSeries((current) => current.filter((row) => row.id !== item.id))}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {pt.common.remove}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>{pt.clinic.sessionTherapist}</Label>
                <Select
                  value={item.clinicPhysiotherapistId || undefined}
                  onValueChange={(value) => updateSeries(item.id, { clinicPhysiotherapistId: value })}
                >
                  <SelectTrigger><SelectValue placeholder={pt.common.select} /></SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{pt.clinic.weekdays}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_SHORT.map((label, weekday) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleWeekday(item.id, weekday)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm',
                        item.weekdays.includes(weekday)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                          : 'hover:bg-[var(--color-accent)]',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{pt.clinic.sessionTime}</Label>
                  <Select value={item.time} onValueChange={(value) => updateSeries(item.id, { time: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{pt.clinic.durationMinutes}</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={item.durationMinutes}
                    onChange={(event) => updateSeries(item.id, { durationMinutes: Number(event.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={() => setSeries((current) => [...current, newSeries()])}>
            <Plus className="mr-2 h-4 w-4" />
            {pt.clinic.addTherapistSeries}
          </Button>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {pt.clinic.previewTitle} ({proposed.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!proposed.length && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.previewEmpty}</p>
          )}
          {proposed.slice(0, 40).map((slot) => {
            const key = `${slot.seriesId}-${slot.scheduledAt.toISOString()}`
            const conflicted = conflictKeys.has(key)
            return (
              <div
                key={key}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                  conflicted && 'border-red-300 bg-red-50 text-red-700',
                )}
              >
                <span>{formatDate(slot.date)} · {WEEKDAY_SHORT[new Date(`${slot.date}T12:00:00`).getDay()]} · {slot.time}</span>
                <span>{staffById.get(slot.clinicPhysiotherapistId) ?? pt.clinic.sessionTherapist}</span>
              </div>
            )
          })}
          {proposed.length > 40 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              +{proposed.length - 40} {pt.clinic.moreSessions}
            </p>
          )}
          {conflicts.length > 0 && (
            <p className="text-sm text-red-600">{pt.clinic.scheduleHasConflicts}</p>
          )}
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? pt.common.loading : `${pt.clinic.confirmSchedule} (${proposed.length})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
