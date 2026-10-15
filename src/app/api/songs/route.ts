import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/security/user";
import { rateLimit } from "@/lib/security/rate-limit";
import { escapeLike, parseBody, songSchema } from "@/lib/security/validate";

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
    .select(
      "id, event_id, user_id, artist, song_name, spotify_track_id, album_art, status, requested_at, started_at, finished_at, profiles!user_id(name, avatar_url)",
    )
    .eq("event_id", event.id)
    .in("status", ["waiting", "singing", "done"])
    .order("requested_at", { ascending: true });

  return NextResponse.json({ songs: songs ?? [], event_id: event.id });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const user_id = auth.user.id;

  const limited = rateLimit(req, "songs", 10, 60_000, user_id);
  if (limited) return limited;

  const body = await parseBody(req, songSchema);
  if ("error" in body) return body.error;
  const { artist, song_name, spotify_track_id, album_art } = body.data;

  const db = createServiceClient();
  const event = await getActiveEvent(db);
  if (!event)
    return NextResponse.json({ error: "Sin evento activo" }, { status: 404 });

  const { data: profile } = await db
    .from("profiles")
    .select("is_banned")
    .eq("id", user_id)
    .single();
  if (!profile || profile.is_banned)
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
    .ilike("song_name", escapeLike(song_name))
    .ilike("artist", escapeLike(artist))
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
      spotify_track_id: spotify_track_id ?? null,
      album_art: album_art ?? null,
    })
    .select(
      "id, event_id, user_id, artist, song_name, spotify_track_id, album_art, status, requested_at, profiles!user_id(name, avatar_url)",
    )
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
