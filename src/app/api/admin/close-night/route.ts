import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { parseBody, uuid } from "@/lib/security/validate";
import type { NightPodiumEntry } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await parseBody(req, z.object({ event_id: uuid }));
  if ("error" in body) return body.error;
  const { event_id } = body.data;

  const db = createServiceClient();

  // 1. Obtener datos del evento y calcular el Top 3 cantantes distintos antes de cerrar
  const [{ data: closedEvent }, { data: doneSongs }] = await Promise.all([
    db.from("events").select("id, name, date").eq("id", event_id).single(),
    db
      .from("song_queue")
      .select("id, user_id, song_name, artist, profiles!user_id(name, avatar_url)")
      .eq("event_id", event_id)
      .eq("status", "done"),
  ]);

  const songIds = (doneSongs ?? []).map((s) => s.id);
  const { data: songRatings } = songIds.length
    ? await db
        .from("ratings")
        .select("song_queue_id, stars")
        .in("song_queue_id", songIds)
    : { data: [] as { song_queue_id: string; stars: number }[] };

  const ratingStats = new Map<string, { sum: number; count: number }>();
  for (const r of songRatings ?? []) {
    const cur = ratingStats.get(r.song_queue_id) ?? { sum: 0, count: 0 };
    cur.sum += r.stars;
    cur.count += 1;
    ratingStats.set(r.song_queue_id, cur);
  }

  // Mejor presentación por cantante (cantantes distintos)
  const bestByUser = new Map<
    string,
    Omit<NightPodiumEntry, "position">
  >();

  for (const s of doneSongs ?? []) {
    const st = ratingStats.get(s.id);
    if (!st || st.count === 0) continue;
    const avg = st.sum / st.count;
    const prof = s.profiles as unknown as {
      name?: string;
      avatar_url?: string | null;
    } | null;
    const prev = bestByUser.get(s.user_id);
    if (
      !prev ||
      avg > prev.avg_rating ||
      (avg === prev.avg_rating && st.count > prev.vote_count)
    ) {
      bestByUser.set(s.user_id, {
        event_id,
        event_date: closedEvent?.date ?? new Date().toISOString(),
        user_id: s.user_id,
        user_name: prof?.name ?? "",
        avatar_url: prof?.avatar_url ?? null,
        song_name: s.song_name,
        artist: s.artist,
        avg_rating: Number(avg.toFixed(2)),
        vote_count: st.count,
      });
    }
  }

  const ranked = Array.from(bestByUser.values()).sort(
    (a, b) => b.avg_rating - a.avg_rating || b.vote_count - a.vote_count,
  );

  // 2. Cerrar la noche y crear nuevo evento mediante RPC
  const { data: new_event_id, error } = await db.rpc(
    "close_night_and_create_new",
    { p_event_id: event_id },
  );
  if (error) {
    console.error("[close-night]", error);
    return NextResponse.json(
      { error: "No se pudo cerrar la noche" },
      { status: 500 },
    );
  }

  // 3. Guardar Top 3 en event_winners (respetando el puesto #1 si ya lo insertó el RPC)
  let top3: NightPodiumEntry[] = ranked.slice(0, 3).map((item, i) => ({
    ...item,
    position: i + 1,
  }));
  let podiumSaved = true;

  if (ranked.length > 0) {
    const { data: existing } = await db
      .from("event_winners")
      .select("id, user_id")
      .eq("event_id", event_id);

    const existingUserIds = new Set(
      (existing ?? []).map((e) => e.user_id).filter(Boolean),
    );

    if (existingUserIds.size > 0) {
      // Asegurar coherencia del orden si el RPC desempató distinto en el #1
      const rpcWinnerId = existing?.[0]?.user_id;
      const winnerEntry = ranked.find((r) => r.user_id === rpcWinnerId);
      const others = ranked
        .filter((r) => !existingUserIds.has(r.user_id))
        .slice(0, 2);

      top3 = [
        ...(winnerEntry ? [{ ...winnerEntry, position: 1 }] : []),
        ...others.map((o, idx) => ({ ...o, position: idx + 2 })),
      ];

      if (others.length > 0) {
        const rowsToInsert = others.map((o, idx) => ({
          event_id,
          user_id: o.user_id,
          user_name: o.user_name,
          song_name: o.song_name,
          artist: o.artist ?? "",
          avg_rating: o.avg_rating,
          vote_count: o.vote_count,
          event_date: o.event_date,
          position: idx + 2,
        }));
        const { error: insErr } = await db
          .from("event_winners")
          .insert(rowsToInsert);
        if (insErr) {
          console.error("[close-night] top3 insert skipped:", insErr);
          podiumSaved = false;
        }
      }
    } else {
      const rowsToInsert = top3.map((o) => ({
        event_id,
        user_id: o.user_id,
        user_name: o.user_name,
        song_name: o.song_name,
        artist: o.artist ?? "",
        avg_rating: o.avg_rating,
        vote_count: o.vote_count,
        event_date: o.event_date,
        position: o.position,
      }));
      const { error: insErr } = await db
        .from("event_winners")
        .insert(rowsToInsert);
      if (insErr) {
        console.error("[close-night] top3 insert skipped:", insErr);
        podiumSaved = false;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    new_event_id,
    closed_event: closedEvent ?? { id: event_id, name: "", date: new Date().toISOString() },
    top3,
    podium_saved: podiumSaved,
  });
}
