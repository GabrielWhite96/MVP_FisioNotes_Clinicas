import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExercise, uploadExerciseVideo } from '@/entities/exercise/api/exercise-api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const CATEGORIES = [
  'mobilidade',
  'força',
  'equilíbrio',
  'alongamento',
  'marcha',
  'respiratório',
  'outro',
]

const LEVELS = ['beginner', 'intermediate', 'advanced']

export function ExerciseLibraryEditor() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [category, setCategory] = useState('mobilidade')
  const [level, setLevel] = useState('beginner')
  const [contraindications, setContraindications] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Não autenticado')
      const exercise = await createExercise({
        title,
        description,
        instructions,
        createdBy: user.id,
        category,
        level,
        contraindications: contraindications || undefined,
      })
      if (file) {
        await uploadExerciseVideo(exercise.id, file)
      }
      return exercise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exerciseLibrary })
      setTitle('')
      setDescription('')
      setInstructions('')
      setContraindications('')
      setFile(null)
      setMessage('Exercício adicionado à biblioteca.')
    },
    onError: (err: Error) => setMessage(err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar exercício à biblioteca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Instruções</Label>
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Contraindicações / notas clínicas</Label>
          <Textarea value={contraindications} onChange={(e) => setContraindications(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Vídeo (mp4/webm)</Label>
          <Input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
        <Button
          onClick={() => mutation.mutate()}
          disabled={!title.trim() || mutation.isPending}
        >
          Salvar exercício
        </Button>
      </CardContent>
    </Card>
  )
}
