function requireKey(): string {
  const key = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY");
  if (!key) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  }
  return key;
}

async function importAesKey(raw: string): Promise<CryptoKey> {
  // Accept base64 of 32 bytes, or derive from passphrase via SHA-256
  let bytes: Uint8Array;
  try {
    const decoded = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    bytes = decoded.length === 32 ? decoded : new Uint8Array(await crypto.subtle.digest("SHA-256", decoded));
  } catch {
    bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    );
  }

  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importAesKey(requireKey());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  let binary = "";
  for (let i = 0; i < packed.length; i++) binary += String.fromCharCode(packed[i]!);
  return btoa(binary);
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await importAesKey(requireKey());
  const packed = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}
