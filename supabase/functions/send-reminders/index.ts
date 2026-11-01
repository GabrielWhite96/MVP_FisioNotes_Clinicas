import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const appointment = await supabase.rpc("send_appointment_reminders");
  if (appointment.error) {
    return new Response(JSON.stringify({ error: appointment.error.message }), { status: 500 });
  }

  const evaluation = await supabase.rpc("send_evaluation_reminders");
  if (evaluation.error) {
    return new Response(JSON.stringify({ error: evaluation.error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
