import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint público: solo los campos que necesitan login, entradas y admin
const BASE_FIELDS =
  "id, name, date, is_active, cooldown_minutes, starts_at, ticket_price_bs, ticket_price_usdt, bcv_rate, created_at";
const PUBLIC_FIELDS = `${BASE_FIELDS}, location_name, location_url`;

export async function GET() {
  const db = createServiceClient();
  let { data, error } = await db
    .from("events")
    .select(PUBLIC_FIELDS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Compatibilidad si aún no se ha ejecutado la migración de location_name/location_url
  if (error?.code === "42703" || error?.code === "PGRST204") {
    const fallback = await db
      .from("events")
      .select(BASE_FIELDS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (fallback.data) {
      data = {
        ...fallback.data,
        location_name: null,
        location_url: null,
      } as any;
    }
  }

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
