import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/security/user";
import { rateLimit } from "@/lib/security/rate-limit";
import { avatarUrl } from "@/lib/security/validate";

// Crea el perfil del usuario autenticado a partir de los datos de Google.
// No acepta id/nombre/avatar del cliente.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const limited = rateLimit(req, "create-profile", 10, 60_000, user.id);
  if (limited) return limited;

  const rawName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario";
  const name =
    String(rawName)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, 40) || "Usuario";
  const avatar = avatarUrl.safeParse(user.user_metadata?.avatar_url);

  const db = createServiceClient();
  const { error } = await db
    .from("profiles")
    .upsert(
      { id: user.id, name, avatar_url: avatar.success ? avatar.data : null },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[create-profile]", error);
    return NextResponse.json({ error: "Error al crear perfil" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
