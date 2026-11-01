import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return json({ error: "appointmentId required" }, 400);
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, modality, patient_id, physiotherapist_id")
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return json({ error: "Appointment not found" }, 404);
    }
    if (appointment.modality !== "telehealth") {
      return json({ error: "Appointment is not telehealth" }, 400);
    }

    const dailyKey = Deno.env.get("DAILY_API_KEY");
    const roomName = `telefisio-${appointmentId}`.slice(0, 80);

    if (!dailyKey) {
      await supabase.from("telehealth_sessions").upsert(
        {
          appointment_id: appointmentId,
          provider: "mock",
          room_name: roomName,
          room_url: null,
          status: "created",
          created_by: user.id,
          metadata: { mock: true },
        },
        { onConflict: "appointment_id" }
      );

      return json({
        provider: "mock",
        roomUrl: null,
        message: "DAILY_API_KEY not configured. Using mock video.",
      });
    }

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    const room = await response.json();
    if (!response.ok && response.status !== 400) {
      await supabase.from("telehealth_sessions").upsert(
        {
          appointment_id: appointmentId,
          provider: "daily",
          room_name: roomName,
          status: "failed",
          created_by: user.id,
          metadata: { error: room?.error ?? "Daily room failed" },
        },
        { onConflict: "appointment_id" }
      );
      return json({ error: room?.error ?? "Daily room failed" }, 502);
    }

    const roomUrl = room.url ?? `https://${Deno.env.get("DAILY_DOMAIN")}/${roomName}`;
    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: user.id,
          is_owner: true,
          enable_screenshare: true,
        },
      }),
    });
    const tokenPayload = await tokenRes.json();
    const token = tokenPayload.token ?? null;

    await supabase.from("telehealth_sessions").upsert(
      {
        appointment_id: appointmentId,
        provider: "daily",
        room_name: roomName,
        room_url: roomUrl,
        status: "joined",
        started_at: new Date().toISOString(),
        created_by: user.id,
        metadata: { has_token: Boolean(token) },
      },
      { onConflict: "appointment_id" }
    );

    return json({
      provider: "daily",
      roomUrl,
      token,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
