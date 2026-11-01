import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { createTreatmentPlan, createTreatmentGoal } from '@/entities/treatment-plan/api/treatment-plan-api'
import type { GoalMetricType } from '@/entities/treatment-plan/api/treatment-plan-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { GOAL_METRIC_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

const goalSchema = z.object({
  title: z.string().min(2, 'Informe o título da meta'),
  metricType: z.enum(['distance', 'reps', 'pain_scale', 'custom']),
  targetValue: z.coerce.number().optional(),
  unit: z.string().optional(),
})

const planSchema = z.object({
  primaryGoal: z.string().min(3, 'Informe o objetivo principal'),
  condition: z.string().optional(),
  durationWeeks: z.coerce.number().min(1).max(52),
  frequency: z.string().min(1, 'Informe a frequência'),
  goals: z.array(goalSchema).min(1, 'Adicione ao menos uma meta'),
})

type PlanFormData = z.infer<typeof planSchema>

const METRIC_TYPES = Object.keys(GOAL_METRIC_LABELS) as GoalMetricType[]

interface TreatmentPlanFormProps {
  patientId: string
  physiotherapistId: string
  onSuccess?: () => void
}

export function TreatmentPlanForm({ patientId, physiotherapistId, onSuccess }: TreatmentPlanFormProps) {
  const queryClient = useQueryClient()
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      primaryGoal: '',
      condition: '',
      durationWeeks: 8,
      frequency: '2 sessões/semana',
      goals: [{ title: '', metricType: 'custom', targetValue: undefined, unit: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'goals' })

  const mutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const plan = await createTreatmentPlan({
        patientId,
        physiotherapistId,
        primaryGoal: data.primaryGoal,
        condition: data.condition || undefined,
        durationWeeks: data.durationWeeks,
        frequency: data.frequency,
      })
      await Promise.all(
        data.goals.map((goal) =>
          createTreatmentGoal({
            treatmentPlanId: plan.id,
            title: goal.title,
            metricType: goal.metricType,
            targetValue: goal.targetValue,
            unit: goal.unit || undefined,
          })
        )
      )
      return plan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.treatmentPlans(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTreatmentPlan(patientId) })
      onSuccess?.()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.treatmentPlan.create}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryGoal">{pt.treatmentPlan.primaryGoal}</Label>
            <Input id="primaryGoal" {...register('primaryGoal')} />
            {errors.primaryGoal && <p className="text-sm text-red-600">{errors.primaryGoal.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">{pt.treatmentPlan.condition}</Label>
            <Input id="condition" {...register('condition')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationWeeks">{pt.treatmentPlan.durationWeeks}</Label>
              <Input id="durationWeeks" type="number" min={1} max={52} {...register('durationWeeks')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">{pt.treatmentPlan.frequency}</Label>
              <Input id="frequency" {...register('frequency')} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{pt.treatmentPlan.goals}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ title: '', metricType: 'custom', targetValue: undefined, unit: '' })}
              >
                <Plus className="h-4 w-4" />
                {pt.treatmentPlan.addGoal}
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`goals.${index}.title`}>{pt.treatmentPlan.goalTitle}</Label>
                    <Input id={`goals.${index}.title`} {...register(`goals.${index}.title`)} />
                    {errors.goals?.[index]?.title && (
                      <p className="text-sm text-red-600">{errors.goals[index]?.title?.message}</p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>{pt.treatmentPlan.metricType}</Label>
                    <Select
                      value={watch(`goals.${index}.metricType`)}
                      onValueChange={(v) => setValue(`goals.${index}.metricType`, v as GoalMetricType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{GOAL_METRIC_LABELS[type]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`goals.${index}.targetValue`}>{pt.treatmentPlan.targetValue}</Label>
                    <Input id={`goals.${index}.targetValue`} type="number" {...register(`goals.${index}.targetValue`)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`goals.${index}.unit`}>{pt.treatmentPlan.unit}</Label>
                    <Input id={`goals.${index}.unit`} {...register(`goals.${index}.unit`)} />
                  </div>
                </div>
              </div>
            ))}
            {errors.goals?.root && <p className="text-sm text-red-600">{errors.goals.root.message}</p>}
            {typeof errors.goals?.message === 'string' && (
              <p className="text-sm text-red-600">{errors.goals.message}</p>
            )}
          </div>

          {mutation.isSuccess && <p className="text-sm text-green-600">{pt.treatmentPlan.created}</p>}
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.treatmentPlan.create}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
