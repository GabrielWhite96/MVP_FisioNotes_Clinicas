import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Link2, Link2Off, Loader2 } from 'lucide-react'
import {
  backfillGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarConnection,
  startGoogleCalendarOAuth,
} from '@/entities/google-calendar/api/google-calendar-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { pt } from '@/shared/config/i18n/pt'

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r'

export function GoogleCalendarConnectButton({
  physiotherapistId,
}: {
  physiotherapistId: string
}) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [banner, setBanner] = useState<string | null>(null)

  const connectionQuery = useQuery({
    queryKey: queryKeys.googleCalendar(physiotherapistId),
    queryFn: () => getGoogleCalendarConnection(physiotherapistId),
    enabled: !!physiotherapistId,
  })

  const connectMutation = useMutation({
    mutationFn: startGoogleCalendarOAuth,
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err) => {
      setBanner(err instanceof Error ? err.message : pt.agenda.googleConnectError)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar(physiotherapistId) })
      setBanner(pt.agenda.googleDisconnected)
    },
    onError: (err) => {
      setBanner(err instanceof Error ? err.message : pt.agenda.googleDisconnectError)
    },
  })

  useEffect(() => {
    const status = searchParams.get('google')
    if (!status) return

    if (status === 'connected') {
      setBanner(pt.agenda.googleConnected)
      void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar(physiotherapistId) })
      void backfillGoogleCalendar().catch(() => undefined)
    } else if (status === 'error') {
      const reason = searchParams.get('reason')
      setBanner(
        reason
          ? `${pt.agenda.googleConnectError}: ${reason}`
          : pt.agenda.googleConnectError
      )
    }

    const next = new URLSearchParams(searchParams)
    next.delete('google')
    next.delete('reason')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, queryClient, physiotherapistId])

  const connected = !!connectionQuery.data?.sync_enabled

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {connected ? (
          <>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {pt.agenda.googleSynced}
            </Badge>
            <Button variant="outline" asChild>
              <a href={GOOGLE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {pt.agenda.openGoogleCalendar}
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 h-4 w-4" />
              )}
              {pt.agenda.googleDisconnect}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || connectionQuery.isLoading}
            >
              {connectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {pt.agenda.googleConnect}
            </Button>
            <Button variant="outline" asChild>
              <a href={GOOGLE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {pt.agenda.openGoogleCalendar}
              </a>
            </Button>
          </>
        )}
      </div>
      {connected && connectionQuery.data?.google_account_email && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {connectionQuery.data.google_account_email}
        </p>
      )}
      {banner && (
        <p className="max-w-md text-right text-xs text-[var(--color-muted-foreground)]">{banner}</p>
      )}
    </div>
  )
}
