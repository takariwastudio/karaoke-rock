import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { decrypt } from "@/lib/security/crypto";
import { cleanText, parseBody, uuid } from "@/lib/security/validate";

const schema = z.object({
  token: uuid,
  validated_by: cleanText(50).optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const { token, validated_by } = body.data;

  const db = createServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, name, cedula, status, validated_at, validated_by")
    .eq("token", token)
    .single();

  if (!ticket)
    return NextResponse.json(
      { valid: false, reason: "not_found", message: "QR no reconocido" },
      { status: 404 },
    );

  const info = { name: ticket.name, cedula: decrypt(ticket.cedula) };

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
        ticket: info,
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

  // approved → validate (condición en el UPDATE evita doble uso concurrente)
  const { data: updated } = await db
    .from("tickets")
    .update({
      status: "used",
      validated_at: new Date().toISOString(),
      validated_by: validated_by || "scanner",
    })
    .eq("id", ticket.id)
    .eq("status", "approved")
    .select("id");

  if (!updated?.length)
    return NextResponse.json(
      {
        valid: false,
        reason: "already_used",
        message: "Esta entrada ya fue usada",
        ticket: info,
      },
      { status: 409 },
    );

  return NextResponse.json({
    valid: true,
    message: "¡Entrada válida!",
    ticket: info,
  });
}
