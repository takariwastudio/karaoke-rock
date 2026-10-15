import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { isAdmin, unauthorized } from "@/lib/security/admin-session";
import { decrypt } from "@/lib/security/crypto";
import { cleanText, escapeHtml, parseBody, uuid } from "@/lib/security/validate";

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
  ticket_id: uuid,
  reason: z.union([cleanText(300), z.literal("")]).optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const { ticket_id } = body.data;
  const reason = body.data.reason || "Pago no verificado";
  const db = createServiceClient();

  const { data: ticket } = await db
    .from("tickets")
    .select("id, name, email, status")
    .eq("id", ticket_id)
    .single();
  if (!ticket)
    return NextResponse.json(
      { error: "Ticket no encontrado" },
      { status: 404 },
    );
  if (ticket.status !== "pending")
    return NextResponse.json({ error: "Ya procesado" }, { status: 409 });

  await db
    .from("tickets")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", ticket_id)
    .eq("status", "pending");

  try {
    await resend.emails.send({
      from: `Karaoke Rock <${process.env.RESEND_FROM}>`,
      to: decrypt(ticket.email),
      subject: "Sobre tu solicitud de entrada | Karaoke Rock",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:32px 16px;background:#1a1a1a;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:0 auto;">
  <h1 style="color:#f5f5f5;font-size:24px;letter-spacing:4px;font-family:Impact,Arial,sans-serif;">KARAOKE <span style="color:#e63c23;">ROCK</span></h1>
  <div style="background:#242424;border-radius:16px;padding:24px;border:1px solid #2e2e2e;">
    <p style="color:#f5f5f5;font-size:16px;margin:0 0 12px;">Hola ${escapeHtml(ticket.name)},</p>
    <p style="color:#888;font-size:14px;line-height:1.7;margin:0 0 12px;">No pudimos verificar tu pago.<br>Motivo: <strong style="color:#f5f5f5;">${escapeHtml(reason)}</strong></p>
    <p style="color:#888;font-size:14px;line-height:1.7;margin:0;">Si crees que es un error, contáctanos por WhatsApp o Instagram y te ayudamos.</p>
  </div>
</div></body></html>`,
    });
  } catch (e) {
    console.error("[reject] email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
