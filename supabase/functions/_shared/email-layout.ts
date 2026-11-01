import { escapeHtml } from "./gmail-smtp.ts";

const INK = "#07241e";
const PAPER = "#f6fbf8";
const TEAL = "#1aa7a1";
const TEAL_TEXT = "#f3fffd";
const MUTED = "#3f5c54";

export type EmailDetail = {
  label: string;
  value: string;
  mono?: boolean;
};

export type TeleFisioEmail = {
  logoUrl?: string;
  preview: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  details?: EmailDetail[];
  code?: string;
  ctaLabel: string;
  ctaUrl: string;
  rawCtaUrl?: boolean;
  rawCode?: boolean;
  note?: string;
};

function attrUrl(url: string, raw?: boolean) {
  return raw ? url : escapeHtml(url);
}

function displayUrl(url: string, raw?: boolean) {
  return raw ? url : escapeHtml(url);
}

export function renderTeleFisioText(email: TeleFisioEmail) {
  const lines = [
    email.title,
    "",
    email.greeting,
    ...email.paragraphs,
    "",
    email.details?.flatMap((detail) => [`${detail.label}: ${detail.value}`]),
    email.code ? `Código: ${email.code}` : null,
    "",
    `${email.ctaLabel}: ${email.ctaUrl}`,
    "",
    email.note,
    "",
    "Fisionotes",
  ]
    .flat()
    .filter((line): line is string => typeof line === "string" && line.length > 0);

  return lines.join("\n");
}

export function renderTeleFisioEmail(email: TeleFisioEmail) {
  const ctaHref = attrUrl(email.ctaUrl, email.rawCtaUrl);
  const ctaText = displayUrl(email.ctaUrl, email.rawCtaUrl);
  const title = escapeHtml(email.title);
  const preview = escapeHtml(email.preview);
  const greeting = email.greeting
    ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${INK};">${escapeHtml(email.greeting)}</p>`
    : "";
  const paragraphs = email.paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${MUTED};">${escapeHtml(text)}</p>`,
    )
    .join("");
  const details = email.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 22px;background:#eaf2ee;border-radius:14px;">
        <tr>
          <td style="padding:16px 18px;">
            ${email.details
              .map(
                (detail) =>
                  `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;color:${MUTED};">${escapeHtml(detail.label)}</p>
                   <p style="margin:0 0 14px;font-family:${detail.mono ? "Consolas,'Courier New',monospace" : "Arial,Helvetica,sans-serif"};font-size:${detail.mono ? "15px" : "16px"};line-height:1.4;color:${INK};font-weight:bold;">${escapeHtml(detail.value)}</p>`,
              )
              .join("")}
          </td>
        </tr>
      </table>`
    : "";
  const code = email.code
    ? `<p style="margin:8px 0 22px;padding:16px 12px;text-align:center;font-family:Consolas,'Courier New',monospace;font-size:28px;letter-spacing:0.18em;color:${INK};background:#eaf2ee;border-radius:14px;">${email.rawCode ? email.code : escapeHtml(email.code)}</p>`
    : "";
  const note = email.note
    ? `<p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(email.note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${INK};">
    <div lang="pt-BR" dir="ltr" style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${INK};">
      <tr>
        <td style="height:5px;background:${TEAL};font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 14px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;">
            <tr>
              <td style="padding:0 8px 18px;">
                ${email.logoUrl
                  ? `<img src="${escapeHtml(email.logoUrl)}" alt="Fisionotes" height="36" style="height:36px;width:auto;max-width:220px;display:block;border:0;outline:none;" />`
                  : `<p style="margin:0;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:20px;color:${TEAL_TEXT};">Fisionotes</p>`}
                <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9fc4bc;">Voltar a se mover.</p>
              </td>
            </tr>
            <tr>
              <td style="background:${PAPER};border-radius:28px 18px 18px 18px;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="8" style="width:8px;background:${TEAL};font-size:0;line-height:0;">&nbsp;</td>
                    <td style="padding:32px 28px 30px 24px;">
                      <h1 style="margin:0 0 16px;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:28px;line-height:1.15;color:${INK};font-weight:normal;">${title}</h1>
                      ${greeting}
                      ${paragraphs}
                      ${details}
                      ${code}
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" bgcolor="${TEAL}" style="background:${TEAL};border-radius:14px;">
                            <a href="${ctaHref}" style="display:block;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.2;font-weight:bold;color:${TEAL_TEXT};text-decoration:none;text-align:center;">
                              ${escapeHtml(email.ctaLabel)}
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">
                        Se o botão não abrir, use este link:
                      </p>
                      <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;">
                        <a href="${ctaHref}" style="color:${TEAL};text-decoration:underline;">${ctaText}</a>
                      </p>
                      ${note}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;border-top:0;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#9fc4bc;">
                  Fisionotes · fisioterapia, treino e consulta no ritmo do seu corpo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
