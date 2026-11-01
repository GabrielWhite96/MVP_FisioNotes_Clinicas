import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExerciseLibrary,
  getPatientExercises,
  assignExercise,
  completeExercise,
  type ExerciseDifficultyRating,
} from '@/entities/exercise/api/exercise-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { CheckCircle2 } from 'lucide-react'
import { DIFFICULTY_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { isSameCalendarDay } from '@/shared/lib/dates'

interface AssignExerciseFormProps {
  patientId: string
  physiotherapistId: string
}

export function AssignExerciseForm({ patientId, physiotherapistId }: AssignExerciseFormProps) {
  const queryClient = useQueryClient()
  const [exerciseId, setExerciseId] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [frequency, setFrequency] = useState('daily')

  const libraryQuery = useQuery({
    queryKey: queryKeys.exerciseLibrary,
    queryFn: () => getExerciseLibrary(true),
  })

  const mutation = useMutation({
    mutationFn: () =>
      assignExercise({ patientId, physiotherapistId, exerciseId, sets, reps, frequency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientExercises(patientId) })
      setExerciseId('')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescrever exercício</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Exercício</Label>
          <Select value={exerciseId} onValueChange={setExerciseId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um exercício" />
            </SelectTrigger>
            <SelectContent>
              {libraryQuery.data?.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Séries</Label>
            <Input type="number" value={sets} onChange={(e) => setSets(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Repetições</Label>
            <Input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!exerciseId || mutation.isPending}>
          Prescrever
        </Button>
      </CardContent>
    </Card>
  )
}

const DIFFICULTY_OPTIONS: ExerciseDifficultyRating[] = ['easy', 'moderate', 'hard']

type ExerciseCompletionRow = { completed_at: string }

export function wasCompletedToday(completions: ExerciseCompletionRow[] | null | undefined) {
  return (completions ?? []).some((completion) => isSameCalendarDay(completion.completed_at))
}

/** Daily, blank, and any frequency we cannot schedule still appear today. */
export function countsAsDueToday(frequency: string | null | undefined) {
  const value = (frequency ?? '').trim().toLowerCase()
  if (!value || value === 'daily' || value === 'diario' || value === 'diário') return true
  return value.length > 0
}

export function PatientExerciseList({ patientId, canComplete = false }: { patientId: string; canComplete?: boolean }) {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<ExerciseDifficultyRating | null>(null)

  const query = useQuery({
    queryKey: queryKeys.patientExercises(patientId),
    queryFn: () => getPatientExercises(patientId),
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: ExerciseDifficultyRating }) =>
      completeExercise(id, undefined, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientExercises(patientId) })
      setPendingId(null)
      setDifficulty(null)
    },
  })

  if (query.isLoading) return <LoadingSpinner />
  if (!query.data?.length) {
    return <EmptyState title="Nenhum exercício prescrito" description="Seu fisioterapeuta ainda não atribuiu exercícios." />
  }

  const due = query.data.filter((pe) => countsAsDueToday(pe.frequency))
  const todo = due.filter((pe) => !wasCompletedToday(pe.completions as ExerciseCompletionRow[] | null))
  const done = due.filter((pe) => wasCompletedToday(pe.completions as ExerciseCompletionRow[] | null))

  return (
    <div className="space-y-8">
      <ExerciseSection title={pt.exercise.dueToday}>
        {todo.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{pt.patient.noExercisesToday}</p>
        ) : todo.map((pe) => (
          <ExerciseTaskCard
            key={pe.id}
            exerciseRow={pe}
            doneToday={false}
            canComplete={canComplete}
            pending={pendingId === pe.id}
            difficulty={difficulty}
            confirming={completeMutation.isPending}
            onStart={() => { setPendingId(pe.id); setDifficulty(null) }}
            onDifficulty={setDifficulty}
            onConfirm={() => difficulty && completeMutation.mutate({ id: pe.id, rating: difficulty })}
          />
        ))}
      </ExerciseSection>
      {done.length > 0 && (
        <ExerciseSection title={pt.exercise.doneSection}>
          {done.map((pe) => (
            <ExerciseTaskCard
              key={pe.id}
              exerciseRow={pe}
              doneToday
              canComplete={false}
              pending={false}
              difficulty={null}
              confirming={false}
              onStart={() => undefined}
              onDifficulty={() => undefined}
              onConfirm={() => undefined}
            />
          ))}
        </ExerciseSection>
      )}
    </div>
  )
}

function ExerciseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function ExerciseTaskCard({
  exerciseRow,
  doneToday,
  canComplete,
  pending,
  difficulty,
  confirming,
  onStart,
  onDifficulty,
  onConfirm,
}: {
  exerciseRow: {
    id: string
    sets: number | null
    reps: number | null
    frequency: string | null
    exercise: unknown
    completions: unknown
  }
  doneToday: boolean
  canComplete: boolean
  pending: boolean
  difficulty: ExerciseDifficultyRating | null
  confirming: boolean
  onStart: () => void
  onDifficulty: (value: ExerciseDifficultyRating) => void
  onConfirm: () => void
}) {
  const exercise = exerciseRow.exercise as {
    title: string
    description: string | null
    instructions: string | null
    video_url?: string | null
    category?: string | null
    level?: string | null
  } | null
  const completions = exerciseRow.completions as ExerciseCompletionRow[] | null
  const prescription = pt.exercise.setsReps
    .replace('{sets}', String(exerciseRow.sets ?? 0))
    .replace('{reps}', String(exerciseRow.reps ?? 0))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{exercise?.title}</CardTitle>
          {doneToday && <Badge variant="success">{pt.exercise.doneToday}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base font-medium">{prescription}</p>
        {exercise?.instructions && <p className="text-sm">{exercise.instructions}</p>}
        {exerciseRow.frequency && (
          <p className="text-xs text-[var(--color-muted-foreground)]">{exerciseRow.frequency}</p>
        )}
        {exercise?.description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{exercise.description}</p>
        )}
        {(exercise?.category || exercise?.level) && (
          <div className="flex gap-2">
            {exercise.category && <Badge variant="outline">{exercise.category}</Badge>}
            {exercise.level && <Badge variant="secondary">{exercise.level}</Badge>}
          </div>
        )}
        {exercise?.video_url && (
          <video
            className="aspect-video w-full rounded-md bg-black"
            src={exercise.video_url}
            controls
            preload="metadata"
          />
        )}
        {canComplete && !doneToday && !pending && (
          <Button size="sm" variant="outline" className="w-full" onClick={onStart}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {pt.exercise.markDone}
          </Button>
        )}
        {canComplete && !doneToday && pending && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{pt.exercise.difficulty}</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={difficulty === option ? 'default' : 'outline'}
                  onClick={() => onDifficulty(option)}
                >
                  {DIFFICULTY_LABELS[option]}
                </Button>
              ))}
            </div>
            <Button className="w-full" disabled={!difficulty || confirming} onClick={onConfirm}>
              {confirming ? pt.common.loading : pt.common.confirm}
            </Button>
          </div>
        )}
        {(completions?.length ?? 0) > 0 && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {completions!.length} conclusão(ões)
          </p>
        )}
      </CardContent>
    </Card>
  )
}
