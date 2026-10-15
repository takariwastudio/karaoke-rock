import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { uuid } from "@/lib/security/validate";

// Muestra solo los últimos 4 dígitos: "V-****5678"
function maskCedula(c: string) {
  const digits = c.replace(/\D/g, "");
  const prefix = c.match(/^[A-Z]/i)?.[0]?.toUpperCase();
  return `${prefix ? `${prefix}-` : ""}****${digits.slice(-4)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const limited = rateLimit(req, "ticket-view", 30, 60_000);
  if (limited) return limited;

  if (!uuid.safeParse(params.token).success)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const db = createServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("name, cedula, status, validated_at, events(name, date)")
    .eq("token", params.token)
    .single();

  if (!ticket)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(
    {
      name: ticket.name,
      cedula: maskCedula(decrypt(ticket.cedula)),
      status: ticket.status,
      event_name: (ticket.events as any)?.name,
      event_date: (ticket.events as any)?.date,
      validated_at: ticket.validated_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
