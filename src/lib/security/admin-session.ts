import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sign, safeEqual } from "./crypto";

export const ADMIN_COOKIE = "kr_admin_session";
const TTL_SECONDS = 60 * 60 * 12; // 12 horas

// Cookie: "<expiraEnSegundos>.<firmaHMAC>"
export function createAdminCookie(res: NextResponse) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const value = `${exp}.${sign(`admin:${exp}`)}`;
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function isAdmin(req: NextRequest) {
  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000 || !sig) return false;
  return safeEqual(sig, sign(`admin:${exp}`));
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
