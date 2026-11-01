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
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const amountCents = Number(body.amountCents);
    if (!amountCents || amountCents <= 0) {
      return json({ error: "amountCents required" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const origin = body.successUrl ?? "http://localhost:5173";
    const packageId = body.packageId as string | undefined;

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!patient) return json({ error: "Patient profile not found" }, 400);

    let packageName = "Fisionotes — sessão / programa";
    if (packageId) {
      const { data: pkg } = await supabase
        .from("recovery_packages")
        .select("name, price_cents")
        .eq("id", packageId)
        .single();
      if (pkg?.name) packageName = pkg.name;
    }

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        patient_id: patient.id,
        appointment_id: body.appointmentId ?? null,
        treatment_plan_id: body.treatmentPlanId ?? null,
        package_id: packageId ?? null,
        amount_cents: amountCents,
        currency: "CAD",
        status: "pending",
        metadata: packageId ? { package_id: packageId } : {},
      })
      .select()
      .single();

    if (payError) return json({ error: payError.message }, 400);

    let purchaseId: string | null = null;
    if (packageId) {
      const { data: purchase } = await supabase
        .from("package_purchases")
        .insert({
          patient_id: patient.id,
          package_id: packageId,
          payment_id: payment.id,
          status: "pending",
        })
        .select()
        .single();
      purchaseId = purchase?.id ?? null;

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("invoices").insert({
        patient_id: patient.id,
        payment_id: payment.id,
        package_purchase_id: purchaseId,
        invoice_number: invoiceNumber,
        amount_cents: amountCents,
        currency: "CAD",
        status: "open",
        line_items: [{ label: packageName, amount_cents: amountCents }],
      });
    }

    if (!stripeKey) {
      if (packageId && purchaseId) {
        await activatePackagePurchase(supabase, purchaseId, payment.id, patient.id, amountCents);
      }
      return json({
        url: `${origin}${origin.includes("?") ? "&" : "?"}paid=demo&payment_id=${payment.id}`,
        paymentId: payment.id,
        demo: true,
      });
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", body.successUrl ?? `${origin}?paid=1`);
    params.set("cancel_url", body.cancelUrl ?? `${origin}?paid=0`);
    params.set("line_items[0][price_data][currency]", "cad");
    params.set("line_items[0][price_data][product_data][name]", packageName);
    params.set("line_items[0][price_data][unit_amount]", String(amountCents));
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[payment_id]", payment.id);
    params.set("metadata[patient_id]", patient.id);
    if (packageId) params.set("metadata[package_id]", packageId);
    if (purchaseId) params.set("metadata[package_purchase_id]", purchaseId);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ error: session.error?.message ?? "Stripe error" }, 502);
    }

    await supabase
      .from("payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payment.id);

    return json({ url: session.url, paymentId: payment.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function activatePackagePurchase(
  supabase: ReturnType<typeof createClient>,
  purchaseId: string,
  paymentId: string,
  patientId: string,
  amountCents: number,
) {
  const started = new Date();
  const expires = new Date(started);
  expires.setDate(expires.getDate() + 8 * 7);

  await supabase.from("payments").update({ status: "succeeded" }).eq("id", paymentId);
  await supabase
    .from("package_purchases")
    .update({
      status: "active",
      started_at: started.toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq("id", purchaseId);
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: started.toISOString() })
    .eq("payment_id", paymentId)
    .eq("patient_id", patientId);
  void amountCents;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
