import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createServiceClient();
  const { data } = await db
    .from("events")
    .select("*")
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
