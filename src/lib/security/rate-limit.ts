import "server-only";
import { NextRequest, NextResponse } from "next/server";

// Rate limiter en memoria (ventana fija por IP + clave).
// En serverless cada instancia tiene su propio contador: frena abuso básico,
// pero para un límite global usar Upstash Redis / Vercel KV.
const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimit(
  req: NextRequest,
  key: string,
  limit: number,
  windowMs: number,
  id = clientIp(req),
): NextResponse | null {
  const now = Date.now();
  const k = `${key}:${id}`;
  const b = buckets.get(k);

  if (buckets.size > 10_000)
    buckets.forEach((bv, bk) => bv.reset < now && buckets.delete(bk));

  if (!b || b.reset < now) {
    buckets.set(k, { count: 1, reset: now + windowMs });
    return null;
  }
  b.count++;
  if (b.count <= limit) return null;

  const retry = Math.ceil((b.reset - now) / 1000);
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intenta más tarde." },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}
