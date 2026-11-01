import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  authorizeCaregiver,
  findCaregiverByEmail,
  type CaregiverPermissions,
} from '@/entities/caregiver/api/caregiver-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { pt } from '@/shared/config/i18n/pt'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  view_progress: z.boolean(),
  view_appointments: z.boolean(),
  view_exercises: z.boolean(),
  view_clinical_records: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface CaregiverAuthorizeFormProps {
  patientId: string
}

export function CaregiverAuthorizeForm({ patientId }: CaregiverAuthorizeFormProps) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      view_progress: true,
      view_appointments: true,
      view_exercises: true,
      view_clinical_records: false,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const caregiver = await findCaregiverByEmail(data.email)
      const permissions: Partial<CaregiverPermissions> = {
        view_progress: data.view_progress,
        view_appointments: data.view_appointments,
        view_exercises: data.view_exercises,
        view_clinical_records: data.view_clinical_records,
      }
      return authorizeCaregiver({
        patientId,
        caregiverProfileId: caregiver.id,
        permissions,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregiverLinks(patientId) })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.caregiverAuth.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caregiver-email">{pt.caregiverAuth.email}</Label>
            <Input id="caregiver-email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{pt.caregiverAuth.permissions}</legend>
            <PermissionCheckbox id="view_progress" label={pt.caregiverAuth.viewProgress} register={register} />
            <PermissionCheckbox id="view_appointments" label={pt.caregiverAuth.viewAppointments} register={register} />
            <PermissionCheckbox id="view_exercises" label={pt.caregiverAuth.viewExercises} register={register} />
            <PermissionCheckbox id="view_clinical_records" label={pt.caregiverAuth.viewClinical} register={register} />
          </fieldset>
          {mutation.isSuccess && <p className="text-sm text-green-600">{pt.caregiverAuth.authorized}</p>}
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.caregiverAuth.authorize}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PermissionCheckbox({
  id,
  label,
  register,
}: {
  id: keyof Omit<FormData, 'email'>
  label: string
  register: ReturnType<typeof useForm<FormData>>['register']
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5" {...register(id)} />
      {label}
    </label>
  )
}
