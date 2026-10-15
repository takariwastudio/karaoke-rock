import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint público: solo los campos que necesitan login, entradas y admin
const PUBLIC_FIELDS =
  "id, name, date, is_active, cooldown_minutes, starts_at, ticket_price_bs, ticket_price_usdt, bcv_rate, created_at";

export async function GET() {
  const db = createServiceClient();
  const { data } = await db
    .from("events")
    .select(PUBLIC_FIELDS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data)
    return NextResponse.json(
      { error: "Sin evento activo" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { event: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
