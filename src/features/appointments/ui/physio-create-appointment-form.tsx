import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createAppointment, getBookedSlots } from '@/entities/appointment/api/appointment-api'
import { getAvailability } from '@/entities/physiotherapist/api/physiotherapist-api'
import { getPhysioOwnedPatients } from '@/entities/patient/api/patient-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingSpinner } from '@/shared/ui/states'
import { MODALITY_LABELS, ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { combineDateAndTime, generateTimeSlots } from '@/shared/lib/dates'
import type { AppointmentModality } from '@/shared/types/database'
import { cn } from '@/shared/lib/utils'

export function PhysioCreateAppointmentForm({
  physiotherapistId,
  preselectedPatientId,
  preselectedDate,
  preselectedTime,
}: {
  physiotherapistId: string
  preselectedPatientId?: string
  preselectedDate?: string
  preselectedTime?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [patientId, setPatientId] = useState(preselectedPatientId ?? '')
  const [modality, setModality] = useState<AppointmentModality>('telehealth')
  const [date, setDate] = useState(preselectedDate ?? '')
  const [time, setTime] = useState(preselectedTime ?? '')
  const [duration, setDuration] = useState(60)
  const [homeAddress, setHomeAddress] = useState('')
  const [notes, setNotes] = useState('')

  const patientsQuery = useQuery({
    queryKey: queryKeys.physioPatients(physiotherapistId),
    queryFn: () => getPhysioOwnedPatients(physiotherapistId),
  })

  const availabilityQuery = useQuery({
    queryKey: queryKeys.availability(physiotherapistId),
    queryFn: () => getAvailability(physiotherapistId),
  })

  const bookedSlotsQuery = useQuery({
    queryKey: ['booked-slots', physiotherapistId, date],
    queryFn: () => getBookedSlots(physiotherapistId, date),
    enabled: !!date,
  })

  const selectedDate = date ? new Date(date + 'T12:00:00') : null
  const dayOfWeek = selectedDate?.getDay() ?? -1
  const dayAvailability = useMemo(
    () =>
      availabilityQuery.data?.filter(
        (a) => a.day_of_week === dayOfWeek && a.modality === modality
      ) ?? [],
    [availabilityQuery.data, dayOfWeek, modality]
  )

  const availableSlots = dayAvailability.flatMap((a) =>
    generateTimeSlots(a.start_time, a.end_time, duration, bookedSlotsQuery.data ?? [])
  )

  // Allow agenda-prefilled times even outside configured availability slots
  const slotsWithPrefill =
    time && !availableSlots.includes(time) ? [time, ...availableSlots] : availableSlots

  const mutation = useMutation({
    mutationFn: () => {
      const scheduledAt = combineDateAndTime(new Date(date + 'T12:00:00'), time)
      return createAppointment({
        patientId,
        physiotherapistId,
        modality,
        scheduledAt: scheduledAt.toISOString(),
        homeAddress: modality === 'home_visit' ? homeAddress || undefined : undefined,
        notes: notes || undefined,
        durationMinutes: duration,
      })
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientBilling(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.physioBillingOverview(physiotherapistId) })
      navigate(ROUTES.physio.appointment(appointment.id))
    },
  })

  if (patientsQuery.isLoading) return <LoadingSpinner />

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.physio.newAppointment}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Paciente</Label>
          <Select value={patientId} onValueChange={setPatientId} disabled={!!preselectedPatientId}>
            <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
            <SelectContent>
              {(patientsQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modalidade</Label>
          <Select value={modality} onValueChange={(v) => setModality(v as AppointmentModality)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(MODALITY_LABELS) as AppointmentModality[]).map((m) => (
                <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} />
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
            />
          </div>
        </div>
        {date && (
          <div className="space-y-2">
            <Label>Horário</Label>
            <div className="flex flex-wrap gap-2">
              {slotsWithPrefill.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">Sem horários disponíveis neste dia.</p>
              )}
              {slotsWithPrefill.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm',
                    time === slot
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'hover:bg-[var(--color-accent)]'
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
        {modality === 'home_visit' && (
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
        <Button
          disabled={!patientId || !date || !time || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? pt.common.loading : pt.physio.scheduleAppointment}
        </Button>
      </CardContent>
    </Card>
  )
}
