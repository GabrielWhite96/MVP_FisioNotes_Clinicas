import "jsr:@supabase/functions-js/edge-runtime.d.ts";
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireKey(): string {
  const key = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY");
  if (!key) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  }
  return key;
}

async function importAesKey(raw: string): Promise<CryptoKey> {
  // Accept base64 of 32 bytes, or derive from passphrase via SHA-256
  let bytes: Uint8Array;
  try {
    const decoded = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    bytes = decoded.length === 32 ? decoded : new Uint8Array(await crypto.subtle.digest("SHA-256", decoded));
  } catch {
    bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    );
  }

  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importAesKey(requireKey());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  let binary = "";
  for (let i = 0; i < packed.length; i++) binary += String.fromCharCode(packed[i]!);
  return btoa(binary);
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await importAesKey(requireKey());
  const packed = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function getAppUrl() {
  return (
    Deno.env.get("APP_URL") ??
    Deno.env.get("SITE_URL") ??
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

export function getGoogleClientConfig() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth-callback`;
  return { clientId, clientSecret, redirectUri };
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

export function userClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

export async function requirePhysioId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("physiotherapists")
    .select("id")
    .eq("profile_id", userId)
    .single();
  if (error || !data) throw new Error("Physiotherapist profile not found");
  return data.id as string;
}

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleClientConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description ?? json.error ?? "Token exchange failed");
  }
  return json as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getGoogleClientConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description ?? json.error ?? "Token refresh failed");
  }
  return json as TokenResponse;
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.email as string) ?? null;
}

export async function revokeGoogleToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

type ConnectionRow = {
  physiotherapist_id: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
  calendar_id: string;
  sync_enabled: boolean;
};

export async function getValidAccessToken(
  admin: SupabaseClient,
  physioId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data: conn, error } = await admin
    .from("google_calendar_connections")
    .select(
      "physiotherapist_id, refresh_token_enc, access_token_enc, access_token_expires_at, calendar_id, sync_enabled"
    )
    .eq("physiotherapist_id", physioId)
    .maybeSingle();

  if (error || !conn || !conn.sync_enabled) return null;
  const row = conn as ConnectionRow;

  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0;
  const stillValid = expiresAt > Date.now() + 60_000;

  if (stillValid && row.access_token_enc) {
    return {
      accessToken: await decryptSecret(row.access_token_enc),
      calendarId: row.calendar_id,
    };
  }

  const refreshToken = await decryptSecret(row.refresh_token_enc);
  const tokens = await refreshAccessToken(refreshToken);
  const accessEnc = await encryptSecret(tokens.access_token);
  const expires = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  await admin
    .from("google_calendar_connections")
    .update({
      access_token_enc: accessEnc,
      access_token_expires_at: expires,
      updated_at: new Date().toISOString(),
    })
    .eq("physiotherapist_id", physioId);

  return { accessToken: tokens.access_token, calendarId: row.calendar_id };
}

const MODALITY_LABELS: Record<string, string> = {
  telehealth: "Tele-fisioterapia",
  home_visit: "Atendimento domiciliar",
};

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "Paciente";
  return fullName.trim().split(/\s+/)[0] ?? "Paciente";
}

type AppointmentRow = {
  id: string;
  physiotherapist_id: string;
  modality: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  home_address: string | null;
  patient?: {
    full_name?: string | null;
    profiles?: { full_name?: string | null } | null;
  } | null;
};

function buildEventBody(appointment: AppointmentRow, timeZone: string) {
  const patientName =
    appointment.patient?.full_name ??
    appointment.patient?.profiles?.full_name ??
    "Paciente";
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + (appointment.duration_minutes || 60) * 60_000);
  const appUrl = getAppUrl();
  const modality = MODALITY_LABELS[appointment.modality] ?? appointment.modality;

  return {
    summary: `Consulta TeleFisio — ${firstName(patientName)}`,
    description: [
      modality,
      `Abrir no TeleFisio: ${appUrl}/physio/appointments/${appointment.id}`,
    ].join("\n"),
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    location:
      appointment.modality === "home_visit"
        ? appointment.home_address ?? undefined
        : "Online",
    reminders: { useDefault: true },
  };
}

async function markSync(
  admin: SupabaseClient,
  appointmentId: string,
  patch: Record<string, unknown>
) {
  await admin.from("appointment_google_events").upsert(
    {
      appointment_id: appointmentId,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "appointment_id" }
  );
}

export async function syncAppointmentToGoogle(
  admin: SupabaseClient,
  appointmentId: string,
  options?: { forceDelete?: boolean }
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { data: appointment, error } = await admin
    .from("appointments")
    .select(`
      id, physiotherapist_id, modality, status, scheduled_at, duration_minutes, home_address,
      patient:patients(full_name, profiles:profiles(full_name))
    `)
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    return { ok: false, error: "Appointment not found" };
  }

  const appt = appointment as AppointmentRow;
  const tokens = await getValidAccessToken(admin, appt.physiotherapist_id);
  if (!tokens) return { ok: true, skipped: true };

  const { data: mapping } = await admin
    .from("appointment_google_events")
    .select("google_event_id, google_calendar_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const shouldDelete =
    options?.forceDelete ||
    appt.status === "cancelled" ||
    appt.status === "no_show";

  const calendarId = encodeURIComponent(tokens.calendarId || "primary");
  const headers = {
    Authorization: `Bearer ${tokens.accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    if (shouldDelete) {
      if (mapping?.google_event_id) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${mapping.google_event_id}`,
          { method: "DELETE", headers }
        );
        if (!delRes.ok && delRes.status !== 404 && delRes.status !== 410) {
          const errBody = await delRes.text();
          throw new Error(errBody || `Google delete failed (${delRes.status})`);
        }
        await admin.from("appointment_google_events").delete().eq("appointment_id", appointmentId);
      }
      return { ok: true };
    }

    const { data: physio } = await admin
      .from("physiotherapists")
      .select("profiles:profiles(timezone)")
      .eq("id", appt.physiotherapist_id)
      .single();
    const timeZone =
      (physio as { profiles?: { timezone?: string } | null } | null)?.profiles?.timezone ??
      "America/Edmonton";

    const body = buildEventBody(appt, timeZone);

    if (mapping?.google_event_id) {
      const patchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${mapping.google_event_id}`,
        { method: "PATCH", headers, body: JSON.stringify(body) }
      );
      if (!patchRes.ok) {
        const errBody = await patchRes.text();
        throw new Error(errBody || `Google update failed (${patchRes.status})`);
      }
      await markSync(admin, appointmentId, {
        google_event_id: mapping.google_event_id,
        google_calendar_id: tokens.calendarId,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
        last_error: null,
      });
      return { ok: true };
    }

    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      { method: "POST", headers, body: JSON.stringify(body) }
    );
    const created = await createRes.json();
    if (!createRes.ok) {
      throw new Error(created.error?.message ?? `Google create failed (${createRes.status})`);
    }

    await markSync(admin, appointmentId, {
      google_event_id: created.id,
      google_calendar_id: tokens.calendarId,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await markSync(admin, appointmentId, {
      google_event_id: mapping?.google_event_id ?? null,
      google_calendar_id: tokens.calendarId,
      sync_status: "error",
      last_error: message.slice(0, 500),
    });
    return { ok: false, error: message };
  }
}

export async function backfillUpcoming(
  admin: SupabaseClient,
  physioId: string
): Promise<{ synced: number; errors: number }> {
  const now = new Date().toISOString();
  const { data: appointments } = await admin
    .from("appointments")
    .select("id")
    .eq("physiotherapist_id", physioId)
    .gte("scheduled_at", now)
    .in("status", ["scheduled", "confirmed"]);

  let synced = 0;
  let errors = 0;
  for (const row of appointments ?? []) {
    const result = await syncAppointmentToGoogle(admin, row.id as string);
    if (result.ok && !result.skipped) synced += 1;
    if (!result.ok) errors += 1;
  }
  return { synced, errors };
}


Deno.serve(async (req) => {
  const appUrl = getAppUrl();
  const fail = (reason: string) =>
    Response.redirect(
      `${appUrl}/physio/agenda?google=error&reason=${encodeURIComponent(reason)}`,
      302
    );

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) return fail(oauthError);
    if (!code || !state) return fail("missing_code_or_state");

    const admin = adminClient();
    const { data: stateRow, error: stateError } = await admin
      .from("google_oauth_states")
      .select("physiotherapist_id, expires_at")
      .eq("state", state)
      .maybeSingle();

    await admin.from("google_oauth_states").delete().eq("state", state);

    if (stateError || !stateRow) return fail("invalid_state");
    if (new Date(stateRow.expires_at as string).getTime() < Date.now()) {
      return fail("expired_state");
    }

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return fail("missing_refresh_token");
    }

    const email = await fetchGoogleEmail(tokens.access_token);
    const refreshEnc = await encryptSecret(tokens.refresh_token);
    const accessEnc = await encryptSecret(tokens.access_token);
    const expires = new Date(
      Date.now() + (tokens.expires_in ?? 3600) * 1000
    ).toISOString();

    const { error: upsertError } = await admin.from("google_calendar_connections").upsert(
      {
        physiotherapist_id: stateRow.physiotherapist_id,
        google_account_email: email,
        refresh_token_enc: refreshEnc,
        access_token_enc: accessEnc,
        access_token_expires_at: expires,
        calendar_id: "primary",
        sync_enabled: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "physiotherapist_id" }
    );
    if (upsertError) return fail(upsertError.message);

    // Best-effort backfill of upcoming appointments
    try {
      await backfillUpcoming(admin, stateRow.physiotherapist_id as string);
    } catch {
      // connection still saved
    }

    return Response.redirect(`${appUrl}/physio/agenda?google=connected`, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "callback_failed";
    return fail(message);
  }
});
