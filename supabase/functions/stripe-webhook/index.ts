import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendGmail } from "../_shared/gmail-smtp.ts";
import { renderTeleFisioEmail, renderTeleFisioText } from "../_shared/email-layout.ts";

type StripeObject = {
  id?: string;
  object?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  status?: string;
  payment_status?: string;
  customer_email?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string>;
  client_reference_id?: string | null;
};

function customerId(value: StripeObject["customer"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

function subscriptionId(value: StripeObject["subscription"] | string | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

function mapSubscriptionStatus(stripeStatus: string | undefined): "active" | "inactive" {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  return "inactive";
}

function generatePassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function appOrigin() {
  return (Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL") ?? "http://localhost:5173")
    .trim()
    .replace(/\/$/, "");
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((item) => {
      const [k, v] = item.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const digest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (digest.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < digest.length; i += 1) {
    mismatch |= digest.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sendCredentialsEmail(input: {
  to: string;
  email: string;
  password?: string;
  loginUrl: string;
  kind: "created" | "reactivated";
}) {
  const gmailUser = (Deno.env.get("GMAIL_USER") ?? "").trim();
  const appPassword = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replaceAll(" ", "");
  if (!gmailUser || !appPassword) {
    return { ok: false as const, reason: "missing_key", status: 501 };
  }
  if (input.to.includes("\r") || input.to.includes("\n")) {
    return { ok: false as const, reason: "invalid_email", status: 400 };
  }

  const created = input.kind === "created";
  const subject = created
    ? "Seu acesso ao Fisionotes foi criado"
    : "Sua assinatura do Fisionotes está ativa";
  const emailContent = {
    preview: created
      ? "Pagamento confirmado. Entre com e-mail e senha temporária."
      : "Pagamento confirmado. Sua assinatura voltou a ficar ativa.",
    title: created ? "Sua conta profissional está pronta" : "Sua assinatura está ativa de novo",
    greeting: created
      ? "O pagamento foi confirmado e o acesso profissional foi criado."
      : "O pagamento foi confirmado e sua assinatura voltou a ficar ativa.",
    paragraphs: created
      ? ["Entre com os dados abaixo. Depois do primeiro acesso, troque a senha."]
      : ["Entre com o e-mail da conta e a senha que você já usa no Fisionotes."],
    details: [
      { label: "E-mail", value: input.email },
      ...(input.password
        ? [{ label: "Senha temporária", value: input.password, mono: true }]
        : []),
    ],
    ctaLabel: "Entrar no Fisionotes",
    ctaUrl: input.loginUrl,
    logoUrl: `${appOrigin()}/logos/logo_semfundo_com_nome_horizontal.png`,
    note: "Se você não reconhece esta assinatura, fale com o suporte pelo mesmo e-mail desta mensagem.",
  };

  return sendGmail({
    user: gmailUser,
    appPassword,
    to: input.to,
    subject,
    html: renderTeleFisioEmail(emailContent),
    text: renderTeleFisioText(emailContent),
  });
}

async function markPhysioActive(
  supabase: SupabaseClient,
  physioId: string,
  updates: Record<string, string | null>,
) {
  const { error } = await supabase.from("physiotherapists").update(updates).eq("id", physioId);
  if (error) throw error;
}

async function provisionSaasAccess(supabase: SupabaseClient, obj: StripeObject) {
  const email = (
    obj.customer_details?.email ??
    obj.customer_email ??
    obj.metadata?.signup_email ??
    ""
  ).trim().toLowerCase();
  const fullName = (obj.metadata?.full_name ?? obj.customer_details?.name ?? email.split("@")[0] ?? "Fisioterapeuta")
    .trim()
    .slice(0, 120);
  const customer = customerId(obj.customer);
  const subId = subscriptionId(obj.subscription);
  const physioFromMeta = obj.metadata?.physiotherapist_id || obj.client_reference_id || "";
  const updates: Record<string, string | null> = {
    subscription_status: obj.payment_status === "unpaid" ? "inactive" : "active",
  };
  if (customer) updates.stripe_customer_id = customer;
  if (subId) updates.stripe_subscription_id = subId;

  if (obj.payment_status === "unpaid") {
    if (physioFromMeta) await markPhysioActive(supabase, physioFromMeta, updates);
    return { ok: true as const };
  }

  let physioId = physioFromMeta;
  let profileId: string | null = null;
  let credentialsSentAt: string | null = null;
  let provisionedByStripe = false;

  if (physioId) {
    const { data: existing } = await supabase
      .from("physiotherapists")
      .select("id, profile_id, credentials_email_sent_at")
      .eq("id", physioId)
      .maybeSingle();
    if (existing) {
      profileId = existing.profile_id;
      credentialsSentAt = existing.credentials_email_sent_at;
    }
  }

  if (!profileId && email) {
    const { data: existingUserId } = await supabase.rpc("service_find_auth_user_id", { p_email: email });
    if (typeof existingUserId === "string" && existingUserId) {
      profileId = existingUserId;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", existingUserId)
        .maybeSingle();
      if (profile && profile.role !== "physiotherapist") {
        console.error("saas checkout email belongs to another role");
        return { ok: true as const };
      }
      const { data: existingPhysio } = await supabase
        .from("physiotherapists")
        .select("id, credentials_email_sent_at")
        .eq("profile_id", existingUserId)
        .maybeSingle();
      if (existingPhysio) {
        physioId = existingPhysio.id;
        credentialsSentAt = existingPhysio.credentials_email_sent_at;
      }
    }
  }

  let generatedPassword: string | undefined;
  let createdNow = false;

  if (!profileId) {
    if (!email) throw new Error("missing_email");
    const { data: provisionToken, error: allowError } = await supabase.rpc("service_allow_stripe_physio", {
      p_email: email,
      p_full_name: fullName,
    });
    if (allowError || !provisionToken) throw allowError ?? new Error("provision_allow_failed");
    const provisionTokenValue = String(provisionToken);
    generatedPassword = generatePassword();
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "physiotherapist",
        provision_token: provisionTokenValue,
      },
      app_metadata: { provisioned_by: "stripe_saas", role: "physiotherapist" },
    });
    if (createError || !created.user) {
      console.error("createUser failed", createError?.message ?? "create_user_failed");
      throw createError ?? new Error("create_user_failed");
    }
    profileId = created.user.id;
    createdNow = true;
    const { data: createdPhysio } = await supabase
      .from("physiotherapists")
      .select("id, credentials_email_sent_at")
      .eq("profile_id", profileId)
      .maybeSingle();
    physioId = createdPhysio?.id ?? "";
    credentialsSentAt = createdPhysio?.credentials_email_sent_at ?? null;
    provisionedByStripe = true;
  } else {
    const { data: user } = await supabase.auth.admin.getUserById(profileId);
    provisionedByStripe = user.user?.app_metadata?.provisioned_by === "stripe_saas";
  }

  if (!physioId && profileId) {
    const { data: createdPhysio } = await supabase
      .from("physiotherapists")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();
    physioId = createdPhysio?.id ?? "";
  }
  if (!physioId) throw new Error("physio_missing");

  await markPhysioActive(supabase, physioId, updates);

  if (credentialsSentAt) return { ok: true as const };

  const loginUrl = `${appOrigin()}/auth/login`;
  const shouldIssuePassword = createdNow || provisionedByStripe;
  if (shouldIssuePassword && !generatedPassword) {
    generatedPassword = generatePassword();
    const { error: passwordError } = await supabase.auth.admin.updateUserById(profileId, {
      password: generatedPassword,
    });
    if (passwordError) throw passwordError;
  }

  const sent = await sendCredentialsEmail({
    to: email,
    email,
    password: shouldIssuePassword ? generatedPassword : undefined,
    loginUrl,
    kind: shouldIssuePassword ? "created" : "reactivated",
  });
  if (!sent.ok) return sent;

  await supabase
    .from("physiotherapists")
    .update({ credentials_email_sent_at: new Date().toISOString() })
    .eq("id", physioId);

  return { ok: true as const };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 501 });
  }
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 501 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }
  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as {
    type?: string;
    data?: { object?: StripeObject };
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const obj = event.data?.object;
  const kind = obj?.metadata?.kind;
  const physioFromMeta = obj?.metadata?.physiotherapist_id;

  if (kind === "saas" || physioFromMeta) {
    if (event.type === "checkout.session.completed") {
      try {
        const result = await provisionSaasAccess(supabase, obj ?? {});
        if (!result.ok) {
          return new Response(JSON.stringify({ error: result.reason }), { status: result.status });
        }
      } catch (error) {
        console.error("saas provision failed", error instanceof Error ? error.message : "unknown");
        return new Response(JSON.stringify({ error: "provision_failed" }), { status: 500 });
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const status = event.type === "customer.subscription.deleted"
        ? "inactive"
        : mapSubscriptionStatus(obj?.status);
      const updates: Record<string, string | null> = { subscription_status: status };
      const customer = customerId(obj?.customer);
      const subId = obj?.object === "subscription" ? obj.id ?? null : subscriptionId(obj?.subscription);
      if (customer) updates.stripe_customer_id = customer;
      if (subId) updates.stripe_subscription_id = subId;

      if (physioFromMeta) {
        await supabase.from("physiotherapists").update(updates).eq("id", physioFromMeta);
      } else if (customer) {
        await supabase.from("physiotherapists").update(updates).eq("stripe_customer_id", customer);
      } else if (subId) {
        await supabase.from("physiotherapists").update(updates).eq("stripe_subscription_id", subId);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const paymentId = obj?.metadata?.payment_id;
  const purchaseId = obj?.metadata?.package_purchase_id;
  const sessionId = obj?.id;

  if (event.type === "checkout.session.completed" && (paymentId || sessionId)) {
    let query = supabase.from("payments").update({ status: "succeeded" });
    if (paymentId) query = query.eq("id", paymentId);
    else if (sessionId) query = query.eq("stripe_checkout_session_id", sessionId);
    await query;

    if (purchaseId) {
      const started = new Date();
      const expires = new Date(started);
      expires.setDate(expires.getDate() + 8 * 7);
      await supabase
        .from("package_purchases")
        .update({
          status: "active",
          started_at: started.toISOString(),
          expires_at: expires.toISOString(),
        })
        .eq("id", purchaseId);
    }

    if (paymentId) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payment_id", paymentId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
