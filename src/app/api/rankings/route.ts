import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const db = createServiceClient();

  // Ranking histórico: promedio de todas las canciones calificadas
  const { data: songs } = await db
    .from("song_queue")
    .select("user_id, id, profiles!user_id(name, avatar_url)")
    .eq("status", "done");

  const { data: ratings } = await db.from("ratings").select("*");

  const { data: winners } = await db
    .from("event_winners")
    .select("user_id, user_name, avg_rating, vote_count, event_date, song_name")
    .order("created_at", { ascending: false });

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

  winners?.forEach((w) => {
    if (!w.user_id) return;
    if (userMap[w.user_id]) userMap[w.user_id].timesWon++;
  });

  const historical = Object.values(userMap)
    .filter((u) => u.totalVotes > 0)
    .map((u) => ({ ...u, avg: u.totalStars / u.totalVotes }))
    .sort((a, b) => b.avg - a.avg);

  return NextResponse.json({ historical, winners: winners ?? [] });
}
