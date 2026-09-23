import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Sin evento activo" }, { status: 404 });
  return NextResponse.json({ event: data });
}
