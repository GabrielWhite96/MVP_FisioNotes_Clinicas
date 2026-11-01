import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  getGoogleClientConfig,
  GOOGLE_SCOPES,
  requirePhysioId,
  userClient,
  adminClient,
} from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = userClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const physioId = await requirePhysioId(supabase, user.id);
    const { clientId, redirectUri } = getGoogleClientConfig();

    const state = crypto.randomUUID();
    const admin = adminClient();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    await admin.from("google_oauth_states").delete().lt("expires_at", new Date().toISOString());
    const { error: stateError } = await admin.from("google_oauth_states").insert({
      state,
      physiotherapist_id: physioId,
      expires_at: expiresAt,
    });
    if (stateError) throw stateError;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("google-calendar-oauth-start", message);
    const status =
      message.includes("GOOGLE_CLIENT_ID") || message.includes("GOOGLE_CLIENT_SECRET")
        ? 503
        : 500;
    return json({ error: message }, status);
  }
});
