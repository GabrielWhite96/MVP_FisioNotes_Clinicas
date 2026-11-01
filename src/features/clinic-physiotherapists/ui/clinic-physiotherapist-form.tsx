import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  createClinicPhysiotherapist,
  updateClinicPhysiotherapist,
} from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { ClinicPhysiotherapist } from '@/shared/types/database'

const schema = z.object({
  fullName: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  specialties: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

function parseSpecialties(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ClinicPhysiotherapistForm({
  practiceId,
  staff,
}: {
  practiceId: string
  staff?: ClinicPhysiotherapist
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: staff?.full_name ?? '',
      email: staff?.email ?? '',
      phone: staff?.phone ?? '',
      licenseNumber: staff?.license_number ?? '',
      specialties: (staff?.specialties ?? []).join(', '),
      notes: staff?.notes ?? '',
      isActive: staff?.is_active ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        licenseNumber: data.licenseNumber || null,
        specialties: parseSpecialties(data.specialties),
        notes: data.notes || null,
        isActive: data.isActive,
      }
      if (staff) {
        return updateClinicPhysiotherapist(staff.id, practiceId, {
          full_name: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          license_number: payload.licenseNumber,
          specialties: payload.specialties,
          notes: payload.notes,
          is_active: payload.isActive,
        })
      }
      return createClinicPhysiotherapist({
        practiceId,
        ...payload,
      })
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicPhysiotherapists(practiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicPhysiotherapist(saved.id) })
      navigate(ROUTES.physio.staffDetail(saved.id))
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{staff ? pt.clinic.editStaff : pt.clinic.newStaff}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input {...register('fullName')} />
            {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{pt.clinicalRecord.phone}</Label>
              <Input {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{pt.clinic.licenseNumber}</Label>
            <Input {...register('licenseNumber')} />
          </div>
          <div className="space-y-2">
            <Label>{pt.clinic.specialties}</Label>
            <Input {...register('specialties')} />
            <p className="text-xs text-[var(--color-muted-foreground)]">{pt.clinic.specialtiesHint}</p>
          </div>
          <div className="space-y-2">
            <Label>{pt.clinic.notes}</Label>
            <Textarea rows={3} {...register('notes')} />
          </div>
          {staff && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
              {pt.clinic.active}
            </label>
          )}
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : staff ? pt.common.save : pt.clinic.createStaff}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
