import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { getAvailability, setAvailability } from '@/entities/physiotherapist/api/physiotherapist-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingSpinner } from '@/shared/ui/states'
import { getDayName } from '@/shared/lib/dates'
import { MODALITY_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { AppointmentModality } from '@/shared/types/database'

interface SlotDraft {
  day_of_week: number
  start_time: string
  end_time: string
  modality: AppointmentModality
}

const DAYS = [1, 2, 3, 4, 5, 6, 0]
const MODALITIES: AppointmentModality[] = ['telehealth', 'home_visit']

function emptySlot(): SlotDraft {
  return { day_of_week: 1, start_time: '09:00', end_time: '17:00', modality: 'telehealth' }
}

function toTimeInput(value: string) {
  return value.slice(0, 5)
}

interface AvailabilityEditorProps {
  physiotherapistId: string
}

export function AvailabilityEditor({ physiotherapistId }: AvailabilityEditorProps) {
  const queryClient = useQueryClient()
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()])

  const query = useQuery({
    queryKey: queryKeys.availability(physiotherapistId),
    queryFn: () => getAvailability(physiotherapistId),
    enabled: !!physiotherapistId,
  })

  useEffect(() => {
    if (!query.data) return
    if (query.data.length === 0) {
      setSlots([emptySlot()])
      return
    }
    setSlots(
      query.data.map((a) => ({
        day_of_week: a.day_of_week,
        start_time: toTimeInput(a.start_time),
        end_time: toTimeInput(a.end_time),
        modality: a.modality as AppointmentModality,
      }))
    )
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => setAvailability(physiotherapistId, slots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability(physiotherapistId) })
    },
  })

  const updateSlot = (index: number, patch: Partial<SlotDraft>) => {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{pt.scheduling.availability}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setSlots((s) => [...s, emptySlot()])}>
          <Plus className="h-4 w-4" />
          {pt.scheduling.addSlot}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading && <LoadingSpinner />}
        {slots.map((slot, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-5 sm:items-end">
            <div className="space-y-2">
              <Label>{pt.scheduling.day}</Label>
              <Select
                value={String(slot.day_of_week)}
                onValueChange={(v) => updateSlot(index, { day_of_week: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={String(day)}>{getDayName(day)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{pt.scheduling.start}</Label>
              <Input
                type="time"
                value={slot.start_time}
                onChange={(e) => updateSlot(index, { start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{pt.scheduling.end}</Label>
              <Input
                type="time"
                value={slot.end_time}
                onChange={(e) => updateSlot(index, { end_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{pt.scheduling.modality}</Label>
              <Select
                value={slot.modality}
                onValueChange={(v) => updateSlot(index, { modality: v as AppointmentModality })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={slots.length === 1}
              onClick={() => setSlots((s) => s.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {mutation.isSuccess && <p className="text-sm text-green-600">{pt.scheduling.saved}</p>}
        {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || slots.length === 0}>
          {mutation.isPending ? pt.common.loading : pt.scheduling.saveSlots}
        </Button>
      </CardContent>
    </Card>
  )
}
