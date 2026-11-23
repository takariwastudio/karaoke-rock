import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createServiceClient();

  // Ranking histórico: promedio de todas las canciones calificadas
  const { data: songs } = await db
    .from("song_queue")
    .select("user_id, id, profiles!user_id(name, avatar_url)")
    .eq("status", "done");

  const { data: ratings } = await db
    .from("ratings")
    .select("song_queue_id, stars");

  let { data: winners, error: winnersErr } = await db
    .from("event_winners")
    .select(
      "event_id, position, user_id, user_name, avg_rating, vote_count, event_date, song_name, artist, created_at",
    )
    .order("event_date", { ascending: false })
    .order("position", { ascending: true });

  if (winnersErr?.code === "42703" || winnersErr?.code === "PGRST204") {
    const fallback = await db
      .from("event_winners")
      .select(
        "event_id, user_id, user_name, avg_rating, vote_count, event_date, song_name, artist, created_at",
      )
      .order("created_at", { ascending: false });
    winners = (fallback.data ?? []).map((w: any) => ({ ...w, position: 1 }));
  }

  // Agrupar por usuario
  const userMap: Record<
    string,
    {
      user_id: string;
      name: string;
      avatar_url: string | null;
      totalStars: number;
      totalVotes: number;
      timesWon: number;
    }
  > = {};

  songs?.forEach((song) => {
    const uid = song.user_id;
    const prof = song.profiles as any;
    const rs = ratings?.filter((r) => r.song_queue_id === song.id) ?? [];
    if (!rs.length) return;
    if (!userMap[uid])
      userMap[uid] = {
        user_id: uid,
        name: prof?.name ?? "",
        avatar_url: prof?.avatar_url ?? null,
        totalStars: 0,
        totalVotes: 0,
        timesWon: 0,
      };
    userMap[uid].totalStars += rs.reduce((s, r) => s + r.stars, 0);
    userMap[uid].totalVotes += rs.length;
  });

  winners?.forEach((w: any) => {
    if (!w.user_id) return;
    if ((w.position ?? 1) === 1 && userMap[w.user_id])
      userMap[w.user_id].timesWon++;
  });

  const historical = Object.values(userMap)
    .filter((u) => u.totalVotes > 0)
    .map((u) => ({ ...u, avg: u.totalStars / u.totalVotes }))
    .sort((a, b) => b.avg - a.avg);

  return NextResponse.json({ historical, winners: winners ?? [] });
}
