import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CURRENT_CONSENT_VERSION,
  REQUIRED_CONSENT_TYPES,
  acceptConsent,
  getConsents,
  type ConsentType,
} from '@/entities/consent/api/consent-api'
import { getPatientByProfileId } from '@/entities/patient/api/patient-api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { pt } from '@/shared/config/i18n/pt'

const CONSENT_LABELS: Record<ConsentType, string> = {
  telehealth: pt.consent.telehealth,
  privacy: pt.consent.privacy,
  data_processing: pt.consent.data_processing,
  terms: pt.consent.terms,
  caregiver_access: pt.consent.caregiver_access,
}

interface ConsentModalProps {
  patientId?: string
}

export function ConsentModal({ patientId }: ConsentModalProps) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [accepted, setAccepted] = useState(false)

  const patientQuery = useQuery({
    queryKey: queryKeys.patient(user?.id ?? ''),
    queryFn: () => getPatientByProfileId(user!.id),
    enabled: !patientId && profile?.role === 'patient' && !!user?.id,
  })

  const resolvedPatientId = patientId ?? patientQuery.data?.id ?? ''

  const consentsQuery = useQuery({
    queryKey: queryKeys.consents(resolvedPatientId),
    queryFn: () => getConsents(resolvedPatientId),
    enabled: !!resolvedPatientId,
  })

  const missing = REQUIRED_CONSENT_TYPES.filter((type) => {
    const active = consentsQuery.data?.some(
      (c) =>
        c.type === type &&
        !c.revoked_at &&
        (!c.expires_at || new Date(c.expires_at) > new Date()) &&
        c.version === CURRENT_CONSENT_VERSION
    )
    return !active
  })

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        missing.map((type) =>
          acceptConsent({
            patientId: resolvedPatientId,
            type,
            version: CURRENT_CONSENT_VERSION,
          })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consents(resolvedPatientId) })
    },
  })

  const open =
    profile?.role === 'patient' &&
    !!resolvedPatientId &&
    !consentsQuery.isLoading &&
    missing.length > 0

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{pt.consent.title}</DialogTitle>
          <DialogDescription>{pt.consent.subtitle}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {missing.map((type) => (
            <li key={type} className="rounded-md border p-3 text-sm">
              {CONSENT_LABELS[type]}
            </li>
          ))}
        </ul>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>{pt.consent.acceptAll}</span>
        </label>
        {mutation.error && (
          <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
        )}
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!accepted || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? pt.common.loading : pt.consent.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
