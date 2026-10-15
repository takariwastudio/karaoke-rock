import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const {
    action,
    event_id,
    user_id,
    song_id,
    cooldown_minutes,
    starts_at,
    bcv_rate,
    ticket_price_bs,
    ticket_price_usdt,
  } = await req.json();
  const db = createServiceClient();

  switch (action) {
    case "ping":
      return NextResponse.json({ ok: true });
    case "start": {
      const { data: first } = await db
        .from("song_queue")
        .select("id")
        .eq("event_id", event_id)
        .eq("status", "waiting")
        .order("requested_at")
        .limit(1)
        .single();
      if (!first)
        return NextResponse.json({ error: "Cola vacía" }, { status: 404 });
      await db
        .from("song_queue")
        .update({ status: "singing", started_at: new Date().toISOString() })
        .eq("id", first.id);
      return NextResponse.json({ ok: true });
    }
    case "next":
    case "noshow": {
      const finalStatus = action === "noshow" ? "noshow" : "done";
      await db
        .from("song_queue")
        .update({ status: finalStatus, finished_at: new Date().toISOString() })
        .eq("event_id", event_id)
        .eq("status", "singing");
      const { data: next } = await db
        .from("song_queue")
        .select("id")
        .eq("event_id", event_id)
        .eq("status", "waiting")
        .order("requested_at")
        .limit(1)
        .single();
      if (next)
        await db
          .from("song_queue")
          .update({ status: "singing", started_at: new Date().toISOString() })
          .eq("id", next.id);
      return NextResponse.json({ ok: true });
    }
    case "ban":
    case "unban": {
      await db
        .from("profiles")
        .update({ is_banned: action === "ban" })
        .eq("id", user_id);
      return NextResponse.json({ ok: true });
    }
    case "remove": {
      await db
        .from("song_queue")
        .update({ status: "noshow" })
        .eq("id", song_id);
      return NextResponse.json({ ok: true });
    }
    case "prioritize": {
      const { data: first } = await db
        .from("song_queue")
        .select("requested_at")
        .eq("event_id", event_id)
        .eq("status", "waiting")
        .order("requested_at")
        .limit(1)
        .single();
      if (first) {
        const newTime = new Date(
          new Date(first.requested_at).getTime() - 1000,
        ).toISOString();
        await db
          .from("song_queue")
          .update({ requested_at: newTime })
          .eq("id", song_id);
      }
      return NextResponse.json({ ok: true });
    }
    case "set_event_time": {
      const { error } = await db
        .from("events")
        .update({ starts_at: starts_at ?? null })
        .eq("id", event_id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "set_cooldown": {
      if (!event_id || cooldown_minutes === undefined)
        return NextResponse.json(
          { error: "Faltan parámetros" },
          { status: 400 },
        );
      const { error } = await db
        .from("events")
        .update({ cooldown_minutes: Number(cooldown_minutes) })
        .eq("id", event_id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "set_bcv_rate": {
      const { error } = await db
        .from("events")
        .update({ bcv_rate })
        .eq("id", event_id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "set_ticket_price_bs": {
      const { error, data } = await db
        .from("events")
        .update({ ticket_price_bs })
        .eq("id", event_id)
        .select("id, ticket_price_bs");
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, updated: data });
    }
    case "set_ticket_price_usdt": {
      const { error, data } = await db
        .from("events")
        .update({ ticket_price_usdt })
        .eq("id", event_id)
        .select("id, ticket_price_usdt");
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, updated: data });
    }
    default:
      return NextResponse.json(
        { error: "Acción desconocida" },
        { status: 400 },
      );
  }
}
