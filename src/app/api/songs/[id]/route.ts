import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/security/user";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  escapeLike,
  parseBody,
  songSchema,
  uuid,
} from "@/lib/security/validate";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const user_id = auth.user.id;

  const limited = rateLimit(req, "songs-edit", 10, 60_000, user_id);
  if (limited) return limited;

  if (!uuid.safeParse(params.id).success)
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });

  const body = await parseBody(req, songSchema);
  if ("error" in body) return body.error;
  const { artist, song_name, spotify_track_id, album_art } = body.data;

  const db = createServiceClient();

  const { data: entry } = await db
    .from("song_queue")
    .select("id, user_id, status, event_id")
    .eq("id", params.id)
    .single();

  if (!entry)
    return NextResponse.json(
      { error: "Entrada no encontrada" },
      { status: 404 },
    );
  if (entry.user_id !== user_id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (entry.status !== "waiting")
    return NextResponse.json(
      { error: "Solo puedes cambiar canciones en espera" },
      { status: 409 },
    );

  // Verificar que la nueva canción no esté ya pedida por otro
  const { data: taken } = await db
    .from("song_queue")
    .select("id")
    .eq("event_id", entry.event_id)
    .ilike("song_name", escapeLike(song_name))
    .ilike("artist", escapeLike(artist))
    .neq("id", params.id)
    .not("status", "eq", "removed")
    .limit(1)
    .single();

  if (taken)
    return NextResponse.json(
      {
        error: "song_taken",
        message: "🎸 Esa canción ya fue pedida hoy. ¡Elige otra!",
      },
      { status: 409 },
    );

  const { error } = await db
    .from("song_queue")
    .update({
      artist,
      song_name,
      spotify_track_id: spotify_track_id ?? null,
      album_art: album_art ?? null,
    })
    .eq("id", params.id)
    .eq("user_id", user_id);

  if (error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
