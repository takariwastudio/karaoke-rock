import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/security/crypto";
import {
  clearAdminCookie,
  createAdminCookie,
  isAdmin,
} from "@/lib/security/admin-session";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseBody } from "@/lib/security/validate";

export const dynamic = "force-dynamic";

// ¿Sesión admin activa?
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { authed: isAdmin(req) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Login
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "admin-login", 5, 15 * 60_000);
  if (limited) return limited;

  const body = await parseBody(req, z.object({ password: z.string().max(200) }));
  if ("error" in body) return body.error;

  if (!verifyPassword(body.data.password, process.env.ADMIN_PASSWORD_HASH))
    return NextResponse.json({ error: "Password incorrecto" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  createAdminCookie(res);
  return res;
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
