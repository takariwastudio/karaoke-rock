import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

async function getActiveEvent(db: ReturnType<typeof createServiceClient>) {
  const { data } = await db
    .from("events")
    .select("id, cooldown_minutes")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function GET() {
  const db = createServiceClient();
  const event = await getActiveEvent(db);
  if (!event)
    return NextResponse.json({ error: "Sin evento activo" }, { status: 404 });

  const { data: songs } = await db
    .from("song_queue")
    .select("*, profiles!user_id(name, avatar_url)")
    .eq("event_id", event.id)
    .in("status", ["waiting", "singing", "done"])
    .order("requested_at", { ascending: true });

  return NextResponse.json({ songs: songs ?? [], event_id: event.id });
}

export async function POST(req: NextRequest) {
  const { artist, song_name, spotify_track_id, album_art, user_id } =
    await req.json();
  if (!artist || !song_name || !user_id)
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const db = createServiceClient();
  const event = await getActiveEvent(db);
  if (!event)
    return NextResponse.json({ error: "Sin evento activo" }, { status: 404 });

  const { data: profile } = await db
    .from("profiles")
    .select("is_banned")
    .eq("id", user_id)
    .single();
  if (profile?.is_banned)
    return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  // Cooldown
  const { data: last } = await db
    .from("song_queue")
    .select("requested_at")
    .eq("event_id", event.id)
    .eq("user_id", user_id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .single();

  if (last) {
    const elapsed = Date.now() - new Date(last.requested_at).getTime();
    const limit = event.cooldown_minutes * 60_000;
    if (elapsed < limit) {
      const rem = Math.ceil((limit - elapsed) / 60_000);
      return NextResponse.json(
        { error: "cooldown", message: `Espera ${rem} min más`, remaining: rem },
        { status: 429 },
      );
    }
  }

  // Canción ya pedida hoy
  const { data: songExists } = await db
    .from("song_queue")
    .select("id")
    .eq("event_id", event.id)
    .ilike("song_name", song_name.trim())
    .ilike("artist", artist.trim())
    .not("status", "eq", "removed")
    .limit(1)
    .single();

  if (songExists) {
    return NextResponse.json(
      {
        error: "song_taken",
        message:
          "Esa canción ya fue pedida hoy. ¡Elige otra! Así no te molestas que alguien que cante feo, ya la tenga pedida.",
      },
      { status: 409 },
    );
  }

  const { data: song, error } = await db
    .from("song_queue")
    .insert({
      event_id: event.id,
      user_id,
      artist,
      song_name,
      spotify_track_id,
      album_art,
    })
    .select("*, profiles!user_id(name, avatar_url)")
    .single();

  if (error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });

  const { count } = await db
    .from("song_queue")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "waiting");

  return NextResponse.json({ song, position: count ?? 1 }, { status: 201 });
}
