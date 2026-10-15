import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

// ── Cifrado de datos sensibles (AES-256-GCM) ───────────────
// Formato almacenado: "enc:v1:<iv>:<tag>:<ciphertext>" (base64url)
const PREFIX = "enc:v1:";

function dataKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY no está configurada");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new Error("DATA_ENCRYPTION_KEY debe ser 32 bytes en base64");
  return key;
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

// Acepta valores legados en texto plano (registros previos al cifrado)
export function decrypt(value: string | null | undefined) {
  if (!value || !value.startsWith(PREFIX)) return value ?? "";
  try {
    const [iv, tag, enc] = value.slice(PREFIX.length).split(":");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      dataKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(enc, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

export const TICKET_ENCRYPTED_FIELDS = ["email", "phone", "cedula"] as const;

export function decryptTicket<T extends Record<string, any>>(t: T): T {
  const out: Record<string, any> = { ...t };
  for (const f of TICKET_ENCRYPTED_FIELDS)
    if (f in out) out[f] = decrypt(out[f]);
  return out as T;
}

// ── Hash de contraseñas (scrypt) ───────────────────────────
// Formato: "scrypt:<salt>:<hash>" (base64url). Generar con `npm run hash-password`.
// (sin "$": Next.js expande $VARIABLES dentro de los .env)
export function verifyPassword(password: string, stored: string | undefined) {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

// ── Firma HMAC para la cookie de sesión admin ──────────────
function sessionSecret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 caracteres");
  return s;
}

export function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
