import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { id, name, avatar_url } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db
    .from("profiles")
    .upsert(
      { id, name, avatar_url },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
