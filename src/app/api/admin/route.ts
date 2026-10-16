import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { parseBody, uuid } from "@/lib/security/validate";
import { round2 } from "@/lib/money";

const price = z.number().finite().min(0).max(1_000_000_000).transform(round2);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ping") }),
  z.object({ action: z.literal("start"), event_id: uuid }),
  z.object({ action: z.enum(["next", "noshow"]), event_id: uuid }),
  z.object({ action: z.enum(["ban", "unban"]), user_id: uuid }),
  z.object({ action: z.literal("remove"), song_id: uuid }),
  z.object({ action: z.literal("prioritize"), event_id: uuid, song_id: uuid }),
  z.object({
    action: z.literal("set_event_time"),
    event_id: uuid,
    starts_at: z.string().datetime().nullable().optional(),
  }),
  z.object({
    action: z.literal("set_cooldown"),
    event_id: uuid,
    cooldown_minutes: z.number().int().min(0).max(600),
  }),
  z.object({ action: z.literal("set_bcv_rate"), event_id: uuid, bcv_rate: price }),
  z.object({
    action: z.literal("set_ticket_price_bs"),
    event_id: uuid,
    ticket_price_bs: price,
  }),
  z.object({
    action: z.literal("set_ticket_price_usdt"),
    event_id: uuid,
    ticket_price_usdt: price,
  }),
]);

const fail = () =>
  NextResponse.json({ error: "Error al guardar" }, { status: 500 });

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const p = body.data;
  const db = createServiceClient();

  switch (p.action) {
    case "ping":
      return NextResponse.json({ ok: true });
    case "start": {
      const { data: first } = await db
        .from("song_queue")
        .select("id")
        .eq("event_id", p.event_id)
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
      const finalStatus = p.action === "noshow" ? "noshow" : "done";
      await db
        .from("song_queue")
        .update({ status: finalStatus, finished_at: new Date().toISOString() })
        .eq("event_id", p.event_id)
        .eq("status", "singing");
      const { data: next } = await db
        .from("song_queue")
        .select("id")
        .eq("event_id", p.event_id)
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
        .update({ is_banned: p.action === "ban" })
        .eq("id", p.user_id);
      return NextResponse.json({ ok: true });
    }
    case "remove": {
      await db
        .from("song_queue")
        .update({ status: "noshow" })
        .eq("id", p.song_id);
      return NextResponse.json({ ok: true });
    }
    case "prioritize": {
      const { data: first } = await db
        .from("song_queue")
        .select("requested_at")
        .eq("event_id", p.event_id)
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
          .eq("id", p.song_id);
      }
      return NextResponse.json({ ok: true });
    }
    case "set_event_time": {
      const { error } = await db
        .from("events")
        .update({ starts_at: p.starts_at ?? null })
        .eq("id", p.event_id);
      if (error) return fail();
      return NextResponse.json({ ok: true });
    }
    case "set_cooldown": {
      const { error } = await db
        .from("events")
        .update({ cooldown_minutes: p.cooldown_minutes })
        .eq("id", p.event_id);
      if (error) return fail();
      return NextResponse.json({ ok: true });
    }
    case "set_bcv_rate": {
      const { error } = await db
        .from("events")
        .update({ bcv_rate: p.bcv_rate })
        .eq("id", p.event_id);
      if (error) return fail();
      return NextResponse.json({ ok: true });
    }
    case "set_ticket_price_bs": {
      const { error, data } = await db
        .from("events")
        .update({ ticket_price_bs: p.ticket_price_bs })
        .eq("id", p.event_id)
        .select("id, ticket_price_bs");
      if (error) return fail();
      return NextResponse.json({ ok: true, updated: data });
    }
    case "set_ticket_price_usdt": {
      const { error, data } = await db
        .from("events")
        .update({ ticket_price_usdt: p.ticket_price_usdt })
        .eq("id", p.event_id)
        .select("id, ticket_price_usdt");
      if (error) return fail();
      return NextResponse.json({ ok: true, updated: data });
    }
  }
}
