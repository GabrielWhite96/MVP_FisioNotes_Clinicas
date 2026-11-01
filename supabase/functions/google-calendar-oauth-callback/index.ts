import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  backfillUpcoming,
  exchangeCodeForTokens,
  fetchGoogleEmail,
  getAppUrl,
} from "../_shared/google-calendar.ts";
import { encryptSecret } from "../_shared/google-crypto.ts";

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
