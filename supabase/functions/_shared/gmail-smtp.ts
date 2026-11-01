export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function encodeSubject(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export async function sendGmail(input: {
  user: string;
  appPassword: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  let conn: Deno.TlsConn | null = null;
  try {
    conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
    await readSmtp(conn);
    await command(conn, "EHLO telefisio");
    await command(conn, "AUTH LOGIN");
    await command(conn, btoa(input.user));
    await command(conn, btoa(input.appPassword));
    await command(conn, `MAIL FROM:<${input.user}>`);
    await command(conn, `RCPT TO:<${input.to}>`);
    await command(conn, "DATA");
    const boundary = `telefisio-${Date.now().toString(16)}`;
    const html = input.html.replaceAll("\n.", "\n..");
    const text = (input.text ?? "").replaceAll("\n.", "\n..");
    const body = input.text
      ? [
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          "Content-Type: text/plain; charset=UTF-8",
          "Content-Transfer-Encoding: 8bit",
          "",
          text,
          `--${boundary}`,
          "Content-Type: text/html; charset=UTF-8",
          "Content-Transfer-Encoding: 8bit",
          "",
          html,
          `--${boundary}--`,
        ]
      : [
          "Content-Type: text/html; charset=UTF-8",
          "",
          html,
        ];
    const message = [
      `From: Fisionotes <${input.user}>`,
      `To: ${input.to}`,
      `Subject: ${encodeSubject(input.subject)}`,
      "MIME-Version: 1.0",
      ...body,
      ".",
    ].join("\r\n");
    await command(conn, message);
    await command(conn, "QUIT");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("gmail send failed", message.startsWith("smtp ") ? message.slice(0, 8) : "network");
    const authFailed = message.startsWith("smtp 535") || message.startsWith("smtp 534");
    return {
      ok: false,
      reason: authFailed ? "auth_failed" : "send_failed",
      status: authFailed ? 401 : 502,
    };
  } finally {
    try {
      conn?.close();
    } catch {
      // The socket may already be closed after QUIT.
    }
  }
}

async function command(conn: Deno.TlsConn, line: string) {
  await conn.write(new TextEncoder().encode(line + "\r\n"));
  const response = await readSmtp(conn);
  const code = Number(response.slice(0, 3));
  if (!Number.isFinite(code) || code >= 400) {
    throw new Error(`smtp ${Number.isFinite(code) ? code : "000"}`);
  }
}

async function readSmtp(conn: Deno.TlsConn) {
  const buf = new Uint8Array(8192);
  let text = "";
  while (true) {
    const n = await conn.read(buf);
    if (n === null) break;
    text += new TextDecoder().decode(buf.subarray(0, n));
    const lines = text.split("\r\n").filter((line) => line.length > 0);
    const last = lines[lines.length - 1] ?? "";
    if (/^\d{3} /.test(last)) return last;
  }
  return text.trim();
}
