import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  adminClient,
  backfillUpcoming,
  requirePhysioId,
  syncAppointmentToGoogle,
  userClient,
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
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();

    if (body.backfill === true) {
      const result = await backfillUpcoming(admin, physioId);
      return json({ ok: true, ...result });
    }

    const appointmentId = body.appointmentId as string | undefined;
    if (!appointmentId) return json({ error: "appointmentId required" }, 400);

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, physiotherapist_id")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) return json({ error: "Appointment not found" }, 404);
    if (appointment.physiotherapist_id !== physioId) {
      return json({ error: "Forbidden" }, 403);
    }

    const result = await syncAppointmentToGoogle(admin, appointmentId, {
      forceDelete: body.delete === true,
    });

    if (!result.ok) return json({ error: result.error ?? "Sync failed" }, 502);
    return json({ ok: true, skipped: result.skipped ?? false });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
