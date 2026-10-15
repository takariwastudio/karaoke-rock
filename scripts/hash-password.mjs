// Genera ADMIN_PASSWORD_HASH para .env.local / Vercel.
// Uso: npm run hash-password -- "mi-password-segura"
import { randomBytes, scryptSync } from "crypto";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error("Uso: npm run hash-password -- \"<password de 12+ caracteres>\"");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
