import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function allowedOrigin(requested: unknown) {
  const fallback = (Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL") ?? "http://localhost:5173")
    .trim()
    .replace(/\/$/, "");
  const allowed = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://tele-fisio.netlify.app",
  ]);
  try {
    allowed.add(new URL(fallback).origin);
  } catch {
    allowed.add("http://localhost:5173");
  }
  if (typeof requested !== "string" || !requested.trim()) {
    return [...allowed][0];
  }
  try {
    const origin = new URL(requested).origin;
    if (allowed.has(origin)) return origin;
  } catch {
    // Fall through to the configured app origin.
  }
  return [...allowed][0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_SAAS_PRICE_ID");
  if (!stripeKey || !priceId) {
    return json({
      error: "Checkout ainda não está configurado. A assinatura será liberada quando o Stripe estiver ativo.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  const body = await req.json().catch(() => ({})) as {
    origin?: string;
    email?: string;
    fullName?: string;
  };
  const origin = allowedOrigin(body.origin);

  let physio: { id: string; stripe_customer_id: string | null } | null = null;
  let checkoutEmail = "";
  let fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";

  if (authHeader) {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("physiotherapists")
        .select("id, stripe_customer_id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (data) {
        physio = data;
        checkoutEmail = user.email?.trim().toLowerCase() ?? "";
      }
    }
  }

  if (!physio) {
    checkoutEmail = normalizeEmail(body.email);
    if (!EMAIL_RE.test(checkoutEmail) || checkoutEmail.includes("\r") || checkoutEmail.includes("\n")) {
      return json({ error: "Informe um e-mail válido para assinar." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existingUserId } = await admin.rpc("service_find_auth_user_id", {
      p_email: checkoutEmail,
    });
    if (typeof existingUserId === "string" && existingUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", existingUserId)
        .maybeSingle();
      if (profile && profile.role !== "physiotherapist") {
        return json({ error: "Este e-mail já está em uso em outra conta do Fisionotes." }, 409);
      }
      if (profile?.full_name && !fullName) fullName = profile.full_name;
      const { data: existingPhysio } = await admin
        .from("physiotherapists")
        .select("id, stripe_customer_id")
        .eq("profile_id", existingUserId)
        .maybeSingle();
      if (existingPhysio) physio = existingPhysio;
    }
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", physio
    ? `${origin}/physio/assinatura?checkout=success`
    : `${origin}/assinar?checkout=success`);
  params.set("cancel_url", physio
    ? `${origin}/physio/assinatura?checkout=cancel`
    : `${origin}/assinar?checkout=cancel`);
  params.set("metadata[kind]", "saas");
  params.set("metadata[signup_email]", checkoutEmail);
  if (fullName) params.set("metadata[full_name]", fullName);
  params.set("subscription_data[metadata][kind]", "saas");
  params.set("allow_promotion_codes", "true");

  if (physio) {
    params.set("client_reference_id", physio.id);
    params.set("metadata[physiotherapist_id]", physio.id);
    params.set("subscription_data[metadata][physiotherapist_id]", physio.id);
    if (physio.stripe_customer_id) {
      params.set("customer", physio.stripe_customer_id);
    } else if (checkoutEmail) {
      params.set("customer_email", checkoutEmail);
    }
  } else {
    params.set("customer_email", checkoutEmail);
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await stripeRes.json();
  if (!stripeRes.ok) return json({ error: session.error?.message ?? "Stripe error" }, 502);
  return json({ url: session.url });
});
