import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { parseBody, uuid } from "@/lib/security/validate";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await parseBody(req, z.object({ event_id: uuid }));
  if ("error" in body) return body.error;

  const db = createServiceClient();
  const { data: new_event_id, error } = await db.rpc(
    "close_night_and_create_new",
    { p_event_id: body.data.event_id },
  );
  if (error) {
    console.error("[close-night]", error);
    return NextResponse.json(
      { error: "No se pudo cerrar la noche" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, new_event_id });
}
