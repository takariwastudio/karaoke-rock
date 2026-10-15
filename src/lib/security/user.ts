import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Usuario autenticado a partir de la cookie de sesión de Supabase.
// Nunca confiar en un user_id enviado por el cliente.
export async function requireUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  return { user };
}
