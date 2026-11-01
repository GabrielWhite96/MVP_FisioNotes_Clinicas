import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(root, "_shell.html"), "utf8");

function fill(template, values) {
  return Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`__${key}__`, value),
    template,
  );
}

function p(text) {
  return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#3f5c54;">${text}</p>`;
}

function note(text) {
  return `<p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#3f5c54;">${text}</p>`;
}

function codeBlock(value) {
  return `<p style="margin:8px 0 22px;padding:16px 12px;text-align:center;font-family:Consolas,'Courier New',monospace;font-size:28px;letter-spacing:0.18em;color:#07241e;background:#eaf2ee;border-radius:14px;">${value}</p>`;
}

function cta(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" bgcolor="#1aa7a1" style="background:#1aa7a1;border-radius:14px;">
                            <a href="${url}" style="display:block;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.2;font-weight:bold;color:#f3fffd;text-decoration:none;text-align:center;">
                              ${label}
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#3f5c54;">
                        Se o botão não abrir, use este link:
                      </p>
                      <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;">
                        <a href="${url}" style="color:#1aa7a1;text-decoration:underline;">${url}</a>
                      </p>`;
}

const templates = {
  "recovery.html": {
    TITLE: "Redefinir senha",
    PREVIEW: "O link vale só para um clique.",
    BODY: p("Recebemos um pedido para redefinir a senha da sua conta no Fisionotes."),
    CTA: cta("Definir nova senha", "{{ .ConfirmationURL }}"),
    NOTE: note("O link vale só para um clique e expira em breve. Se você não pediu isso, ignore este e-mail. Sua senha atual continua valendo."),
  },
  "confirmation.html": {
    TITLE: "Confirme seu e-mail",
    PREVIEW: "Um clique para ativar sua conta no Fisionotes.",
    BODY: p("Falta só confirmar este e-mail para entrar no Fisionotes com segurança."),
    CTA: cta("Confirmar e-mail", "{{ .ConfirmationURL }}"),
    NOTE: note("Se você não criou uma conta, pode ignorar esta mensagem."),
  },
  "magic_link.html": {
    TITLE: "Entrar no Fisionotes",
    PREVIEW: "Seu link de acesso está pronto.",
    BODY: p("Use o botão abaixo para entrar na sua conta. O link vale só para um clique."),
    CTA: cta("Entrar agora", "{{ .ConfirmationURL }}"),
    NOTE: note("Se você não pediu este acesso, ignore o e-mail."),
  },
  "invite.html": {
    TITLE: "Você foi convidado",
    PREVIEW: "Ative sua conta no Fisionotes.",
    BODY: p("Alguém te convidou para o Fisionotes. Defina sua senha neste link para começar."),
    CTA: cta("Ativar minha conta", "{{ .ConfirmationURL }}"),
    NOTE: note("Se você não esperava este convite, pode ignorar o e-mail."),
  },
  "email_change.html": {
    TITLE: "Confirme o novo e-mail",
    PREVIEW: "Um clique para confirmar a troca de e-mail.",
    BODY: p("Recebemos um pedido para trocar o e-mail da sua conta no Fisionotes. Confirme a nova caixa para concluir."),
    CTA: cta("Confirmar novo e-mail", "{{ .ConfirmationURL }}"),
    NOTE: note("Se você não pediu essa troca, ignore esta mensagem. O e-mail atual continua valendo."),
  },
  "reauthentication.html": {
    TITLE: "Confirme que é você",
    PREVIEW: "Use o código para continuar no Fisionotes.",
    BODY: `${p("Para concluir esta ação, use o código abaixo.")}${codeBlock("{{ .Token }}")}`,
    CTA: "",
    NOTE: note("O código expira em breve. Se você não pediu isso, ignore o e-mail."),
  },
  "password_changed.html": {
    TITLE: "Sua senha foi alterada",
    PREVIEW: "A senha da sua conta no Fisionotes mudou.",
    BODY: p("A senha da sua conta no Fisionotes foi alterada agora. Se foi você, não precisa fazer mais nada."),
    CTA: cta("Entrar no Fisionotes", "{{ .SiteURL }}"),
    NOTE: note("Se você não fez essa alteração, redefina a senha imediatamente e fale com o suporte."),
  },
  "email_changed.html": {
    TITLE: "Seu e-mail foi alterado",
    PREVIEW: "O e-mail da sua conta no Fisionotes mudou.",
    BODY: p("O e-mail da sua conta no Fisionotes foi alterado. Entre com o novo endereço da próxima vez."),
    CTA: cta("Entrar no Fisionotes", "{{ .SiteURL }}"),
    NOTE: note("Se você não fez essa alteração, fale com o suporte imediatamente."),
  },
};

function detailsBox(rows) {
  const inner = rows
    .map(
      ([label, value, mono]) =>
        `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;color:#3f5c54;">${label}</p>
         <p style="margin:0 0 14px;font-family:${mono ? "Consolas,'Courier New',monospace" : "Arial,Helvetica,sans-serif"};font-size:${mono ? "15px" : "16px"};line-height:1.4;color:#07241e;font-weight:bold;">${value}</p>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 22px;background:#eaf2ee;border-radius:14px;"><tr><td style="padding:16px 18px;">${inner}</td></tr></table>`;
}

const gmailPreviews = {
  "patient-invite.html": {
    TITLE: "Seu tratamento te espera",
    PREVIEW: "Defina sua senha e entre no portal do paciente.",
    BODY: `${p("Marina Costa te convidou para o portal do paciente.")}${p("Defina sua senha neste link para acessar exercícios, consultas e check-ins.")}${detailsBox([["E-mail do convite", "paciente@email.com"]])}`,
    CTA: cta("Ativar minha conta", "https://tele-fisio.netlify.app/auth/invite/exemplo"),
    NOTE: note("O convite expira em alguns dias. Se você não esperava este e-mail, pode ignorar."),
  },
  "welcome-account.html": {
    TITLE: "Sua conta profissional está pronta",
    PREVIEW: "Pagamento confirmado. Entre com e-mail e senha temporária.",
    BODY: `${p("O pagamento foi confirmado e o acesso profissional foi criado.")}${p("Entre com os dados abaixo. Depois do primeiro acesso, troque a senha.")}${detailsBox([["E-mail", "fisio@email.com"], ["Senha temporária", "k7#mP2qL9x", true]])}`,
    CTA: cta("Entrar no Fisionotes", "https://tele-fisio.netlify.app/auth/login"),
    NOTE: note("Se você não reconhece esta assinatura, fale com o suporte pelo mesmo e-mail desta mensagem."),
  },
};

const previews = [
  ["Redefinir senha", templates["recovery.html"]],
  ["Conta criada", gmailPreviews["welcome-account.html"]],
  ["Convite do paciente", gmailPreviews["patient-invite.html"]],
  ["Confirmar e-mail", templates["confirmation.html"]],
  ["Link mágico", templates["magic_link.html"]],
  ["Troca de e-mail", templates["email_change.html"]],
  ["Código de confirmação", templates["reauthentication.html"]],
  ["Senha alterada", templates["password_changed.html"]],
];

for (const [file, values] of Object.entries(templates)) {
  writeFileSync(join(root, file), fill(shell, values));
}

const previewCards = previews
  .map(([label, values]) => {
    const sample = fill(shell, {
      ...values,
      CTA: (values.CTA ?? "").replaceAll("{{ .ConfirmationURL }}", "https://tele-fisio.netlify.app/auth/login").replaceAll("{{ .SiteURL }}", "https://tele-fisio.netlify.app"),
      BODY: values.BODY.replaceAll("{{ .Token }}", "184729"),
    }).replaceAll("{{ .SiteURL }}", "https://tele-fisio.netlify.app");
    const srcdoc = sample.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    return `<section style="margin:0 0 36px;">
      <h2 style="margin:0 0 12px;font-family:Arial,sans-serif;color:#f3fffd;font-size:13px;font-weight:bold;">${label}</h2>
      <iframe title="${label}" srcdoc="${srcdoc}" style="width:100%;height:740px;border:0;border-radius:18px;background:#07241e;"></iframe>
    </section>`;
  })
  .join("\n");

writeFileSync(
  join(root, "preview.html"),
  `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fisionotes · prévia dos e-mails</title>
  </head>
  <body style="margin:0;background:#041614;padding:32px 16px 64px;">
    <p style="max-width:720px;margin:0 auto 28px;font-family:Georgia,serif;font-size:28px;color:#f3fffd;">E-mails do Fisionotes</p>
    <div style="max-width:720px;margin:0 auto;">${previewCards}</div>
  </body>
</html>
`,
);

console.log("Auth email templates written.");
