import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";
import { sendGmail } from "../_shared/gmail-smtp.ts";
import { renderTeleFisioEmail, renderTeleFisioText } from "../_shared/email-layout.ts";

function resolveAppOrigin(req: Request): string | null {
  const configured = (Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL") ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  } catch {
    return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ sent: false, reason: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ sent: false, reason: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as {
    inviteId?: string
    kind?: "patient" | "caregiver"
  } | null;

  const inviteId = body?.inviteId?.trim();
  const kind = body?.kind === "caregiver" ? "caregiver" : "patient";
  if (!inviteId) return json({ sent: false, reason: "invalid_body" }, 400);

  const table = kind === "caregiver" ? "caregiver_invites" : "patient_invites";
  const { data: invite, error: inviteError } = await supabase
    .from(table)
    .select("id, email, invite_token, status, expires_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError || !invite) return json({ sent: false, reason: "not_found" }, 403);
  if (invite.status !== "pending") return json({ sent: false, reason: "not_pending" }, 400);
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return json({ sent: false, reason: "expired" }, 400);
  }

  const appOrigin = resolveAppOrigin(req);
  if (!appOrigin) return json({ sent: false, reason: "missing_app_url" });

  const inviteUrl = kind === "patient"
    ? `${appOrigin}/auth/invite/${invite.invite_token}`
    : `${appOrigin}/auth/caregiver-signup`;

  const gmailUser = (Deno.env.get("GMAIL_USER") ?? "").trim();
  const appPassword = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replaceAll(" ", "");
  if (!gmailUser || !appPassword) return json({ sent: false, reason: "missing_key" });
  if (invite.email.includes("\r") || invite.email.includes("\n")) {
    return json({ sent: false, reason: "invalid_email" }, 400);
  }

  const senderName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : "";
  const subject = kind === "caregiver"
    ? "Convite para acompanhar um paciente no Fisionotes"
    : "Convite para acessar seu tratamento no Fisionotes";
  const emailContent = kind === "caregiver"
    ? {
      preview: "Crie sua conta de cuidador no Fisionotes.",
      title: "Acompanhe quem você cuida",
      greeting: senderName
        ? `${senderName} te convidou para o Fisionotes.`
        : "Você foi convidado para o Fisionotes.",
      paragraphs: [
        "Crie sua conta de cuidador com este mesmo e-mail para ver consultas, treinos e check-ins.",
      ],
      details: [{ label: "E-mail do convite", value: invite.email }],
      ctaLabel: "Criar conta de cuidador",
      ctaUrl: inviteUrl,
      note: "Se você não esperava este convite, pode ignorar o e-mail.",
    }
    : {
      preview: "Defina sua senha e entre no portal do paciente.",
      title: "Seu tratamento te espera",
      greeting: senderName
        ? `${senderName} te convidou para o portal do paciente.`
        : "Seu fisioterapeuta te convidou para o portal do paciente.",
      paragraphs: [
        "Defina sua senha neste link para acessar exercícios, consultas e check-ins.",
      ],
      details: [{ label: "E-mail do convite", value: invite.email }],
      ctaLabel: "Ativar minha conta",
      ctaUrl: inviteUrl,
      note: "O convite expira em alguns dias. Se você não esperava este e-mail, pode ignorar.",
    };

  const sent = await sendGmail({
    user: gmailUser,
    appPassword,
    to: invite.email,
    subject,
    html: renderTeleFisioEmail({
      ...emailContent,
      logoUrl: `${appOrigin}/logos/logo_semfundo_com_nome_horizontal.png`,
    }),
    text: renderTeleFisioText(emailContent),
  });

  if (!sent.ok) return json({ sent: false, reason: sent.reason }, sent.status);
  return json({ sent: true });
});
