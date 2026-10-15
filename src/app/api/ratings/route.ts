import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/security/user";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseBody, uuid } from "@/lib/security/validate";

const schema = z.object({
  song_queue_id: uuid,
  stars: z.number().int().min(1).max(5),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const rater_id = auth.user.id;

  const limited = rateLimit(req, "ratings", 30, 60_000, rater_id);
  if (limited) return limited;

  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const { song_queue_id, stars } = body.data;

  const db = createServiceClient();

  const { data: profile } = await db
    .from("profiles")
    .select("is_banned")
    .eq("id", rater_id)
    .single();
  if (!profile || profile.is_banned)
    return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  const { data: entry } = await db
    .from("song_queue")
    .select("status, user_id")
    .eq("id", song_queue_id)
    .single();

  if (!entry)
    return NextResponse.json(
      { error: "Entrada no encontrada" },
      { status: 404 },
    );
  if (!["singing", "done"].includes(entry.status))
    return NextResponse.json(
      { error: "Solo se puede calificar mientras canta o justo después" },
      { status: 409 },
    );
  if (entry.user_id === rater_id)
    return NextResponse.json(
      { error: "No puedes calificarte a ti mismo" },
      { status: 409 },
    );

  const { error } = await db
    .from("ratings")
    .insert({ song_queue_id, rater_id, stars });
  if (error?.code === "23505")
    return NextResponse.json(
      { error: "Ya calificaste este cantante" },
      { status: 409 },
    );
  if (error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
