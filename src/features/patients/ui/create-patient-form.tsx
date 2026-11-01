import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createPatientForPhysio } from '@/entities/patient/api/patient-api'
import { createPatientInvite } from '@/entities/patient/api/patient-invite-api'
import { sendInviteEmail } from '@/entities/notification/api/invite-email-api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { BRAZILIAN_UFS, ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

const schema = z.object({
  fullName: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CreatePatientForm({ physiotherapistId }: { physiotherapistId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const patient = await createPatientForPhysio({
        physiotherapistId,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        addressLine1: data.addressLine1 || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
      })
      const email = data.email?.trim()
      if (!email || !user) return { patient, inviteSent: undefined as boolean | undefined }
      try {
        const invite = await createPatientInvite({
          patientId: patient.id,
          physiotherapistId,
          email,
          invitedBy: user.id,
        })
        const sent = await sendInviteEmail({ inviteId: invite.id, kind: 'patient' })
        return { patient, inviteSent: sent.sent }
      } catch {
        return { patient, inviteSent: false }
      }
    },
    onSuccess: ({ patient, inviteSent }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.physioPatients(physiotherapistId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.physioPatientStats(physiotherapistId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientInvites(patient.id) })
      navigate(`${ROUTES.physio.appointmentNew}?patientId=${patient.id}`, { state: { inviteSent } })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.physio.newPatient}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input {...register('fullName')} />
            {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...register('email')} />
              <p className="text-xs text-[var(--color-muted-foreground)]">{pt.physio.emailCreatesInvite}</p>
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{pt.clinicalRecord.phone}</Label>
              <Input {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{pt.clinicalRecord.dateOfBirth}</Label>
            <Input type="date" {...register('dateOfBirth')} />
          </div>
          <div className="space-y-2">
            <Label>{pt.clinicalRecord.address}</Label>
            <Input {...register('addressLine1')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{pt.clinicalRecord.city}</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label>{pt.clinicalRecord.province}</Label>
              <Select value={watch('province') ?? ''} onValueChange={(v) => setValue('province', v)}>
                <SelectTrigger><SelectValue placeholder={pt.common.select} /></SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_UFS.map((uf) => (
                    <SelectItem key={uf.code} value={uf.code}>{uf.code} — {uf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{pt.clinicalRecord.postalCode}</Label>
              <Input {...register('postalCode')} />
            </div>
          </div>
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.physio.createPatient}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
