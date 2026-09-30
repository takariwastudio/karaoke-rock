import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const db = createServiceClient();
  let query = db
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  const status = searchParams.get("status");
  const event_id = searchParams.get("event_id");
  if (status) query = query.eq("status", status);
  if (event_id) query = query.eq("event_id", event_id);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, cedula, payment_method, payment_ref, event_id } =
    body;
  if (
    !name ||
    !email ||
    !phone ||
    !cedula ||
    !payment_method ||
    !payment_ref ||
    !event_id
  )
    return NextResponse.json(
      { error: "Todos los campos son requeridos" },
      { status: 400 },
    );

  const db = createServiceClient();
  const { data: event } = await db
    .from("events")
    .select("id, ticket_price_bs, ticket_price_usdt, is_active")
    .eq("id", event_id)
    .single();
  if (!event?.is_active)
    return NextResponse.json(
      { error: "Evento no disponible" },
      { status: 404 },
    );

  const payment_currency = payment_method === "binance" ? "USDT" : "Bs";
  const payment_amount =
    payment_method === "binance"
      ? event.ticket_price_usdt
      : event.ticket_price_bs;

  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      event_id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      cedula: cedula.trim(),
      payment_method,
      payment_ref: payment_ref.trim(),
      payment_amount,
      payment_currency,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket }, { status: 201 });
}
