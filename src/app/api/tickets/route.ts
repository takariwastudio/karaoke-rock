import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { decryptTicket, encrypt } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { cleanText, parseBody, uuid } from "@/lib/security/validate";
import { MAX_TICKETS_PER_ORDER } from "@/lib/types";

const STATUSES = ["pending", "approved", "used", "rejected"] as const;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const event_id = searchParams.get("event_id");
  if (status && !STATUSES.includes(status as any))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  if (event_id && !uuid.safeParse(event_id).success)
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });

  const db = createServiceClient();
  let query = db
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (event_id) query = query.eq("event_id", event_id);
  const { data, error } = await query;
  if (error) {
    console.error("[tickets:get]", error);
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
  return NextResponse.json(
    { tickets: (data ?? []).map(decryptTicket) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const ticketSchema = z.object({
  name: cleanText(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s.()-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, "Teléfono inválido")),
  cedula: z
    .string()
    .transform((s) => s.replace(/[\s.]/g, "").toUpperCase())
    .pipe(z.string().regex(/^[VEJPG]?-?\d{5,10}$/, "Cédula inválida")),
  payment_method: z.enum(["pago_movil", "transferencia", "binance"]),
  payment_ref: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,64}$/, "Referencia inválida"),
  event_id: uuid,
  quantity: z.number().int().min(1).max(MAX_TICKETS_PER_ORDER).default(1),
  // Anti-bots: campo trampa (debe venir vacío) y tiempo mínimo de llenado
  website: z.string().max(0).optional(),
  form_started_at: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "tickets", 5, 10 * 60_000);
  if (limited) return limited;

  const body = await parseBody(req, ticketSchema);
  if ("error" in body) return body.error;
  const t = body.data;

  // Bot: llenó el honeypot o envió el formulario en menos de 3 s
  if (t.website || !t.form_started_at || Date.now() - t.form_started_at < 3000)
    return NextResponse.json({ ok: true }, { status: 201 });

  const db = createServiceClient();
  const { data: event } = await db
    .from("events")
    .select("id, ticket_price_bs, ticket_price_usdt, is_active")
    .eq("id", t.event_id)
    .single();
  if (!event?.is_active)
    return NextResponse.json(
      { error: "Evento no disponible" },
      { status: 404 },
    );

  const payment_currency = t.payment_method === "binance" ? "USDT" : "Bs";
  const unit_price =
    t.payment_method === "binance"
      ? event.ticket_price_usdt
      : event.ticket_price_bs;
  const payment_amount =
    unit_price == null ? unit_price : Number(unit_price) * t.quantity;

  const { error } = await db.from("tickets").insert({
    event_id: t.event_id,
    name: t.name,
    email: encrypt(t.email),
    phone: encrypt(t.phone),
    cedula: encrypt(t.cedula),
    payment_method: t.payment_method,
    payment_ref: t.payment_ref,
    payment_amount,
    payment_currency,
    quantity: t.quantity,
  });

  if (error) {
    console.error("[tickets:post]", error);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
