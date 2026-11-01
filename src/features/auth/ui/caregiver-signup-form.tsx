import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase, getSupabaseErrorMessage } from '@/shared/api/supabase'
import { getDashboardRoute } from '../api/auth-api'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function CaregiverSignupForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: params.get('email') ?? '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'caregiver',
          },
        },
      })
      if (error) throw new Error(getSupabaseErrorMessage(error))
      return result
    },
    onSuccess: (result) => {
      if (result.user) navigate(getDashboardRoute('caregiver'))
    },
  })

  return (
    <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="font-display text-3xl font-semibold tracking-tight">Criar conta de cuidador</CardTitle>
        <CardDescription>
          Disponível apenas se você recebeu um convite do paciente.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-6 p-0">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{pt.auth.fullName}</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{pt.auth.email}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{pt.auth.password}</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.auth.signup}
          </Button>
          <p className="text-center text-sm">
            <Link to={ROUTES.login} className="text-[var(--color-primary)] hover:underline">
              {pt.auth.login}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
