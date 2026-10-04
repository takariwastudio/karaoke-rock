import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { token, validated_by } = await req.json();
  if (!token)
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const db = createServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("*")
    .eq("token", token)
    .single();

  if (!ticket)
    return NextResponse.json(
      { valid: false, reason: "not_found", message: "QR no reconocido" },
      { status: 404 },
    );

  if (ticket.status === "used") {
    const usedAt = new Date(ticket.validated_at).toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Caracas",
    });
    return NextResponse.json(
      {
        valid: false,
        reason: "already_used",
        message: "Esta entrada ya fue usada",
        usedAt,
        validated_by: ticket.validated_by,
        ticket: { name: ticket.name, cedula: ticket.cedula },
      },
      { status: 409 },
    );
  }

  if (ticket.status === "pending")
    return NextResponse.json(
      {
        valid: false,
        reason: "pending",
        message: "Pago pendiente de verificación",
      },
      { status: 403 },
    );

  if (ticket.status === "rejected")
    return NextResponse.json(
      { valid: false, reason: "rejected", message: "Entrada rechazada" },
      { status: 403 },
    );

  // approved → validate
  await db
    .from("tickets")
    .update({
      status: "used",
      validated_at: new Date().toISOString(),
      validated_by: validated_by || "scanner",
    })
    .eq("id", ticket.id);

  return NextResponse.json({
    valid: true,
    message: "¡Entrada válida!",
    ticket: { name: ticket.name, cedula: ticket.cedula, email: ticket.email },
  });
}
