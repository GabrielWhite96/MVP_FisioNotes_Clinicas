import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/shared/api/supabase'
import { pt } from '@/shared/config/i18n/pt'

export type GoogleCalendarConnectionStatus = {
  physiotherapist_id: string
  google_account_email: string | null
  calendar_id: string
  sync_enabled: boolean
  connected_at: string
  updated_at: string
}

function mapGoogleCalendarError(message: string): string {
  if (
    message.includes('GOOGLE_CLIENT_ID') ||
    message.includes('GOOGLE_CLIENT_SECRET') ||
    message.includes('GOOGLE_TOKEN_ENCRYPTION_KEY')
  ) {
    return pt.agenda.googleNotConfigured
  }
  if (message === 'Physiotherapist profile not found') {
    return pt.agenda.googlePhysioNotFound
  }
  if (message === 'Edge Function returned a non-2xx status code') {
    return pt.agenda.googleConnectError
  }
  return message
}

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string } | null
      if (payload?.error) return mapGoogleCalendarError(payload.error)
    } catch {
      // Body already consumed or not JSON.
    }
  }
  if (error instanceof Error && error.message) return mapGoogleCalendarError(error.message)
  return fallback
}

export async function getGoogleCalendarConnection(physiotherapistId: string) {
  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select('physiotherapist_id, google_account_email, calendar_id, sync_enabled, connected_at, updated_at')
    .eq('physiotherapist_id', physiotherapistId)
    .maybeSingle()

  if (error) throw error
  return data as GoogleCalendarConnectionStatus | null
}

export async function startGoogleCalendarOAuth(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('google-calendar-oauth-start', {
    body: {},
  })
  if (error) throw new Error(await functionErrorMessage(error, pt.agenda.googleConnectError))
  if (!data?.url) throw new Error(mapGoogleCalendarError(data?.error ?? pt.agenda.googleConnectError))
  return data.url as string
}

export async function disconnectGoogleCalendar() {
  const { data, error } = await supabase.functions.invoke('google-calendar-disconnect', {
    body: {},
  })
  if (error) throw new Error(await functionErrorMessage(error, pt.agenda.googleDisconnectError))
  if (data?.error) throw new Error(mapGoogleCalendarError(data.error))
  return data
}

export async function syncAppointmentToGoogleCalendar(
  appointmentId: string,
  options?: { delete?: boolean }
) {
  try {
    const { error } = await supabase.functions.invoke('google-calendar-sync', {
      body: {
        appointmentId,
        delete: options?.delete === true,
      },
    })
    if (error) {
      console.warn('[google-calendar-sync]', error.message)
    }
  } catch (err) {
    console.warn('[google-calendar-sync]', err)
  }
}

export async function backfillGoogleCalendar() {
  const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
    body: { backfill: true },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { ok: boolean; synced: number; errors: number }
}
