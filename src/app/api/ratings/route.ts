import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { song_queue_id, rater_id, stars } = await req.json();
  if (!song_queue_id || !rater_id || !stars)
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const db = createServiceClient();

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
