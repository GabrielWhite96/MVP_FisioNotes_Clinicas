import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rescheduleAppointment } from '@/entities/appointment/api/appointment-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input, Label } from '@/shared/ui/input'
import { combineDateAndTime } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'

const schema = z.object({
  date: z.string().min(1, 'Selecione uma data'),
  time: z.string().min(1, 'Selecione um horário'),
})

type FormData = z.infer<typeof schema>

interface RescheduleDialogProps {
  appointmentId: string
  currentScheduledAt: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RescheduleDialog({
  appointmentId,
  currentScheduledAt,
  open,
  onOpenChange,
}: RescheduleDialogProps) {
  const queryClient = useQueryClient()
  const current = new Date(currentScheduledAt)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      date: current.toISOString().slice(0, 10),
      time: `${current.getHours().toString().padStart(2, '0')}:${current.getMinutes().toString().padStart(2, '0')}`,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const scheduledAt = combineDateAndTime(new Date(`${data.date}T12:00:00`), data.time)
      return rescheduleAppointment(appointmentId, scheduledAt.toISOString())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(appointmentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() })
      queryClient.invalidateQueries({ queryKey: ['patient-billing'] })
      queryClient.invalidateQueries({ queryKey: ['physio-billing-overview'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pt.scheduling.rescheduleTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">{pt.appointment.newDate}</Label>
            <Input id="reschedule-date" type="date" {...register('date')} />
            {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-time">{pt.appointment.newTime}</Label>
            <Input id="reschedule-time" type="time" {...register('time')} />
            {errors.time && <p className="text-sm text-red-600">{errors.time.message}</p>}
          </div>
          {mutation.error && (
            <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pt.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? pt.common.loading : pt.appointment.reschedule}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
