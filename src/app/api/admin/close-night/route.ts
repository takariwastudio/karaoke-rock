import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { event_id } = await req.json();
  if (!event_id)
    return NextResponse.json({ error: "event_id requerido" }, { status: 400 });

  const db = createServiceClient();
  const { data: new_event_id, error } = await db.rpc(
    "close_night_and_create_new",
    { p_event_id: event_id },
  );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, new_event_id });
}
