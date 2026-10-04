import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { artist, song_name, spotify_track_id, album_art, user_id } =
    await req.json();
  if (!artist || !song_name || !user_id)
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

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
    .ilike("song_name", song_name.trim())
    .ilike("artist", artist.trim())
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
      artist: artist.trim(),
      song_name: song_name.trim(),
      spotify_track_id,
      album_art,
    })
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
