import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  adminClient,
  requirePhysioId,
  revokeGoogleToken,
  userClient,
} from "../_shared/google-calendar.ts";
import { decryptSecret } from "../_shared/google-crypto.ts";

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
    const admin = adminClient();

    const { data: conn } = await admin
      .from("google_calendar_connections")
      .select("refresh_token_enc, access_token_enc")
      .eq("physiotherapist_id", physioId)
      .maybeSingle();

    if (conn?.refresh_token_enc) {
      try {
        const refresh = await decryptSecret(conn.refresh_token_enc as string);
        await revokeGoogleToken(refresh);
      } catch {
        // continue disconnect even if revoke fails
      }
    }

    await admin.from("google_calendar_connections").delete().eq("physiotherapist_id", physioId);

    return json({ ok: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
