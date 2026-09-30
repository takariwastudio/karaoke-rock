import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const db = createServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("name, cedula, status, validated_at, events(name, date)")
    .eq("token", params.token)
    .single();

  if (!ticket)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    name: ticket.name,
    cedula: ticket.cedula,
    status: ticket.status,
    event_name: (ticket.events as any)?.name,
    event_date: (ticket.events as any)?.date,
    validated_at: ticket.validated_at,
  });
}
