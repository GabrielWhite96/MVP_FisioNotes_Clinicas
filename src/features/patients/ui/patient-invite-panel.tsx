import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  buildPatientInviteUrl,
  createPatientInvite,
  getLatestPatientInvite,
  resendPatientInvite,
} from '@/entities/patient/api/patient-invite-api'
import { sendInviteEmail } from '@/entities/notification/api/invite-email-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ACCOUNT_STATUS_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { PatientAccountStatus } from '@/shared/types/database'

export function PatientInvitePanel({
  patientId,
  physiotherapistId,
  invitedBy,
  email,
  accountStatus,
}: {
  patientId: string
  physiotherapistId: string
  invitedBy: string
  email: string | null
  accountStatus: PatientAccountStatus
}) {
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState(email ?? '')
  const [copied, setCopied] = useState(false)
  const [emailNotice, setEmailNotice] = useState<'sent' | 'failed' | null>(null)

  const inviteQuery = useQuery({
    queryKey: queryKeys.patientInvites(patientId),
    queryFn: () => getLatestPatientInvite(patientId),
  })

  const mutation = useMutation({
    mutationFn: () =>
      (accountStatus === 'invite_pending' ? resendPatientInvite : createPatientInvite)({
        patientId,
        physiotherapistId,
        email: inviteEmail,
        invitedBy,
      }),
    onSuccess: async (invite) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patientInvites(patientId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.physioPatients(physiotherapistId) })
      const url = buildPatientInviteUrl(invite.invite_token)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      const result = await sendInviteEmail({ inviteId: invite.id, kind: 'patient' })
      setEmailNotice(result.sent ? 'sent' : 'failed')
    },
  })

  if (accountStatus === 'active') {
    return <Badge variant="success">{ACCOUNT_STATUS_LABELS.active}</Badge>
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={accountStatus === 'invite_pending' ? 'secondary' : 'outline'}>
          {ACCOUNT_STATUS_LABELS[accountStatus]}
        </Badge>
        {inviteQuery.data?.status === 'pending' && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            Expira em {new Date(inviteQuery.data.expires_at).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <Label>E-mail do convite</Label>
        <Input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="paciente@email.com"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!inviteEmail || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {accountStatus === 'invite_pending' ? pt.physio.resendInvite : pt.physio.sendInvite}
        </Button>
        {inviteQuery.data?.status === 'pending' && (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(buildPatientInviteUrl(inviteQuery.data!.invite_token))
              setCopied(true)
            }}
          >
            {pt.physio.copyInviteLink}
          </Button>
        )}
      </div>
      {copied && <p className="text-sm text-green-600">{pt.physio.inviteLinkCopied}</p>}
      {emailNotice === 'sent' && <p className="text-sm text-green-600">{pt.physio.inviteEmailSent}</p>}
      {emailNotice === 'failed' && <p className="text-sm text-amber-700">{pt.physio.inviteEmailNotSent}</p>}
      {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
    </div>
  )
}
