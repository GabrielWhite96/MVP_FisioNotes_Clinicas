import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getClinicalProfile, upsertClinicalProfile } from '@/entities/clinical-profile/api/clinical-profile-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label, Textarea } from '@/shared/ui/input'

interface ClinicalProfileFormProps {
  patientId: string
}

export function ClinicalProfileForm({ patientId }: ClinicalProfileFormProps) {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: queryKeys.clinicalProfile(patientId),
    queryFn: () => getClinicalProfile(patientId),
    enabled: !!patientId,
  })

  const { register, handleSubmit } = useForm({
    values: {
      condition: profileQuery.data?.condition ?? '',
      diagnosis: profileQuery.data?.diagnosis ?? '',
      medicalHistory: profileQuery.data?.medical_history ?? '',
      medications: profileQuery.data?.medications ?? '',
      allergies: profileQuery.data?.allergies ?? '',
      restrictions: profileQuery.data?.restrictions ?? '',
      referringPhysician: profileQuery.data?.referring_physician ?? '',
      emergencyContactName: profileQuery.data?.emergency_contact_name ?? '',
      emergencyContactPhone: profileQuery.data?.emergency_contact_phone ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: {
      condition: string
      diagnosis: string
      medicalHistory: string
      medications: string
      allergies: string
      restrictions: string
      referringPhysician: string
      emergencyContactName: string
      emergencyContactPhone: string
    }) =>
      upsertClinicalProfile({
        patientId,
        condition: data.condition || null,
        diagnosis: data.diagnosis || null,
        medicalHistory: data.medicalHistory || null,
        medications: data.medications || null,
        allergies: data.allergies || null,
        restrictions: data.restrictions || null,
        referringPhysician: data.referringPhysician || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicalProfile(patientId) })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações clínicas</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Condição</Label>
            <Input {...register('condition')} />
          </div>
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Input {...register('diagnosis')} />
          </div>
          <div className="space-y-2">
            <Label>Histórico médico</Label>
            <Textarea {...register('medicalHistory')} />
          </div>
          <div className="space-y-2">
            <Label>Medicamentos</Label>
            <Textarea {...register('medications')} />
          </div>
          <div className="space-y-2">
            <Label>Alergias</Label>
            <Input {...register('allergies')} />
          </div>
          <div className="space-y-2">
            <Label>Restrições</Label>
            <Input {...register('restrictions')} />
          </div>
          <div className="space-y-2">
            <Label>Médico responsável</Label>
            <Input {...register('referringPhysician')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contato de emergência</Label>
              <Input {...register('emergencyContactName')} />
            </div>
            <div className="space-y-2">
              <Label>Telefone de emergência</Label>
              <Input {...register('emergencyContactPhone')} />
            </div>
          </div>
          {mutation.isSuccess && <p className="text-sm text-green-600">Dados clínicos salvos.</p>}
          <Button type="submit" disabled={mutation.isPending}>Salvar dados clínicos</Button>
        </form>
      </CardContent>
    </Card>
  )
}
