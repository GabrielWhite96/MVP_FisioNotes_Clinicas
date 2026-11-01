import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { inviteAcceptSchema, type InviteAcceptFormData } from '../model/schemas'
import { acceptPatientInvite, getDashboardRoute } from '../api/auth-api'
import { getPatientInviteByToken } from '@/entities/patient/api/patient-invite-api'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { LoadingSpinner } from '@/shared/ui/states'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

export function InviteAcceptForm() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const inviteQuery = useQuery({
    queryKey: ['patient-invite', token],
    queryFn: () => getPatientInviteByToken(token!),
    enabled: !!token,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<InviteAcceptFormData>({
    resolver: zodResolver(inviteAcceptSchema),
    values: inviteQuery.data
      ? { fullName: inviteQuery.data.patient_full_name, password: '' }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: (form: InviteAcceptFormData) =>
      acceptPatientInvite({
        email: inviteQuery.data!.email,
        inviteToken: token!,
        form,
      }),
    onSuccess: (result) => {
      if (result.user) navigate(getDashboardRoute('patient'))
    },
  })

  if (inviteQuery.isLoading) {
    return <LoadingSpinner className="mx-auto h-8 w-8" />
  }

  const invite = inviteQuery.data
  const invalid =
    !invite ||
    invite.status === 'expired' ||
    invite.status === 'revoked' ||
    (invite.status === 'pending' && new Date(invite.expires_at) <= new Date())

  if (invite?.status === 'accepted') {
    return (
      <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>{pt.auth.inviteAcceptedTitle}</CardTitle>
          <CardDescription>{pt.auth.inviteAcceptedDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={ROUTES.login} className="text-[var(--color-primary)] hover:underline">
            {pt.auth.login}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (invalid) {
    return (
      <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>{pt.auth.inviteInvalidTitle}</CardTitle>
          <CardDescription>{pt.auth.inviteInvalidDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={ROUTES.login} className="text-[var(--color-primary)] hover:underline">
            {pt.auth.login}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{pt.auth.inviteTitle}</CardTitle>
        <CardDescription>
          {pt.auth.inviteDescription
            .replace('{physio}', invite.physiotherapist_name)
            .replace('{email}', invite.email)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{pt.auth.fullName}</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{pt.auth.email}</Label>
            <Input value={invite.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{pt.auth.password}</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.auth.activateAccount}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
