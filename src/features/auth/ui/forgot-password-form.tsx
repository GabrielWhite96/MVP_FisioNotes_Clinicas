import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../model/schemas'
import { resetPassword } from '../api/auth-api'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

export function ForgotPasswordForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const mutation = useMutation({ mutationFn: resetPassword })

  return (
    <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="font-display text-3xl font-semibold tracking-tight">{pt.auth.resetPassword}</CardTitle>
        <CardDescription>Enviaremos um link de recuperação para seu e-mail.</CardDescription>
      </CardHeader>
      <CardContent className="mt-6 p-0">
        {mutation.isSuccess ? (
          <p className="text-center text-green-700">{pt.auth.resetSent}</p>
        ) : (
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{pt.auth.email}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? pt.common.loading : pt.auth.resetPassword}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link to={ROUTES.login} className="text-[var(--color-primary)] hover:underline">
            {pt.common.back}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
