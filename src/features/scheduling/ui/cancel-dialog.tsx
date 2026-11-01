import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelAppointmentWithReason } from '@/entities/appointment/api/appointment-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label, Textarea } from '@/shared/ui/input'
import { pt } from '@/shared/config/i18n/pt'

const schema = z.object({
  reason: z.string().min(3, 'Informe o motivo do cancelamento'),
})

type FormData = z.infer<typeof schema>

interface CancelDialogProps {
  appointmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled?: () => void
}

export function CancelDialog({ appointmentId, open, onOpenChange, onCancelled }: CancelDialogProps) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => cancelAppointmentWithReason(appointmentId, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(appointmentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() })
      queryClient.invalidateQueries({ queryKey: ['patient-billing'] })
      queryClient.invalidateQueries({ queryKey: ['physio-billing-overview'] })
      onOpenChange(false)
      onCancelled?.()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pt.scheduling.cancelTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{pt.appointment.cancelReason}</Label>
            <Textarea
              id="cancel-reason"
              rows={4}
              placeholder={pt.scheduling.reasonPlaceholder}
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-red-600">{errors.reason.message}</p>}
          </div>
          {mutation.error && (
            <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pt.common.back}
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? pt.common.loading : pt.scheduling.cancelConfirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
