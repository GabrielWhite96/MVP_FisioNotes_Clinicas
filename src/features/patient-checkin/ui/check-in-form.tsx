import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCheckIn, type CheckIn } from '@/entities/check-in/api/check-in-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label, Textarea } from '@/shared/ui/input'
import { pt } from '@/shared/config/i18n/pt'
import { cn } from '@/shared/lib/utils'

export const checkInSchema = z.object({
  painLevel: z.number().min(0).max(10),
  mobilityLevel: z.number().min(0).max(10),
  confidenceLevel: z.number().min(0).max(10),
  exerciseDifficulty: z.number().min(0).max(10),
  generalNotes: z.string().optional(),
})

type CheckInFormData = z.infer<typeof checkInSchema>

const SLIDERS: Array<{ name: keyof Omit<CheckInFormData, 'generalNotes'>; label: string }> = [
  { name: 'painLevel', label: pt.checkIn.pain },
  { name: 'mobilityLevel', label: pt.checkIn.mobility },
  { name: 'confidenceLevel', label: pt.checkIn.confidence },
  { name: 'exerciseDifficulty', label: pt.checkIn.exerciseDifficulty },
]

function ScaleSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'h-3 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-muted)] accent-[var(--color-primary)]',
          '[&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)]'
        )}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>0</span>
        <span>10</span>
      </div>
    </div>
  )
}

export function CheckInTodaySummary({ checkIn }: { checkIn: CheckIn }) {
  const metrics = [
    { label: pt.checkIn.pain, value: checkIn.pain_level },
    { label: pt.checkIn.mobility, value: checkIn.mobility_level },
    { label: pt.checkIn.confidence, value: checkIn.confidence_level },
    { label: pt.checkIn.exerciseDifficulty, value: checkIn.exercise_difficulty },
  ]

  return (
    <Card className="surface-tape shadow-none">
      <CardHeader>
        <CardTitle>{pt.checkIn.title}</CardTitle>
        <CardDescription>{pt.checkIn.alreadySent}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-[var(--color-muted)] p-4 text-center">
              <p className="text-sm text-[var(--color-muted-foreground)]">{metric.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums leading-none">{metric.value ?? '—'}</p>
            </div>
          ))}
        </div>
        {checkIn.general_notes && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{checkIn.general_notes}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface CheckInFormProps {
  patientId: string
  onSuccess?: () => void
}

export function CheckInForm({ patientId, onSuccess }: CheckInFormProps) {
  const queryClient = useQueryClient()
  const { control, register, handleSubmit } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      painLevel: 0,
      mobilityLevel: 5,
      confidenceLevel: 5,
      exerciseDifficulty: 5,
      generalNotes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CheckInFormData) =>
      createCheckIn({
        patientId,
        painLevel: data.painLevel,
        mobilityLevel: data.mobilityLevel,
        confidenceLevel: data.confidenceLevel,
        exerciseDifficulty: data.exerciseDifficulty,
        generalNotes: data.generalNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.latestCheckIn(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientTimeline(patientId) })
      onSuccess?.()
    },
  })

  return (
    <Card className="surface-tape shadow-none">
      <CardHeader>
        <CardTitle>{pt.checkIn.title}</CardTitle>
        <CardDescription>{pt.checkIn.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          {SLIDERS.map(({ name, label }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <ScaleSlider label={label} value={field.value} onChange={field.onChange} />
              )}
            />
          ))}
          <div className="space-y-2">
            <Label htmlFor="generalNotes">{pt.checkIn.notes}</Label>
            <Textarea id="generalNotes" rows={3} {...register('generalNotes')} />
          </div>
          {mutation.isSuccess && <p className="text-sm text-green-600">{pt.checkIn.success}</p>}
          {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.checkIn.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
