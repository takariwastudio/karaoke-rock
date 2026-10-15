import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { ticket_id } = await req.json();
  const db = createServiceClient();

  const { data: ticket } = await db
    .from("tickets")
    .select("*, events(name, date)")
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
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", ticket_id);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://karaokerock.com.ve";
  const entryUrl = `${baseUrl}/entry/${ticket.token}`;
  const qrImgUrl = `${baseUrl}/api/tickets/qr/${ticket.token}`;
  const eventDate = ticket.events?.date
    ? new Date(ticket.events.date).toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Próximamente";
  const methodLabel =
    ticket.payment_method === "pago_movil"
      ? "Pago Móvil"
      : ticket.payment_method === "transferencia"
        ? "Transferencia"
        : "Binance Pay";

  try {
    await resend.emails.send({
      from: `Karaoke Rock <${process.env.RESEND_FROM}>`,
      to: ticket.email,
      subject: "Tu entrada para Karaoke Rock está confirmada",
      html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:28px;">
    <h1 style="color:#f5f5f5;font-size:28px;letter-spacing:6px;margin:0;font-family:Impact,Arial,sans-serif;">KARAOKE <span style="color:#e63c23;">ROCK</span></h1>
    <p style="color:#555;font-size:11px;letter-spacing:3px;margin:4px 0 0;text-transform:uppercase;">Maracay</p>
  </div>
  <div style="background:#242424;border-radius:16px;overflow:hidden;border:1px solid #2e2e2e;">
    <div style="background:#e63c23;padding:14px 24px;">
      <p style="color:#fff;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0;">✓ Entrada Confirmada</p>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#f5f5f5;font-size:22px;margin:0 0 4px;">${ticket.name}</h2>
      <p style="color:#888;font-size:13px;margin:0 0 20px;text-transform:capitalize;">${eventDate}</p>
      <div style="background:#f5f5f5;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
        <img src="${qrImgUrl}" width="220" height="220" alt="QR de entrada" style="display:block;margin:0 auto;"/>
        <p style="color:#1a1a1a;font-size:10px;margin:10px 0 0;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Presenta este código en la entrada</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-top:1px solid #2e2e2e;"><td style="color:#888;padding:8px 0;">Cédula</td><td style="color:#f5f5f5;text-align:right;">${ticket.cedula}</td></tr>
        <tr style="border-top:1px solid #2e2e2e;"><td style="color:#888;padding:8px 0;">Método de pago</td><td style="color:#f5f5f5;text-align:right;">${methodLabel}</td></tr>
        <tr style="border-top:1px solid #2e2e2e;"><td style="color:#888;padding:8px 0;">Monto</td><td style="color:#f5f5f5;text-align:right;">${ticket.payment_amount} ${ticket.payment_currency}</td></tr>
        <tr style="border-top:1px solid #2e2e2e;"><td style="color:#888;padding:8px 0;">Referencia</td><td style="color:#f5f5f5;text-align:right;">${ticket.payment_ref}</td></tr>
        <tr style="border-top:1px solid #2e2e2e;"><td style="color:#888;padding:8px 0;">Entradas</td><td style="color:#f5f5f5;text-align:right;">${ticket.quantity || 1} persona${(ticket.quantity || 1) > 1 ? "s" : ""}</td></tr>
      </table>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <a href="${entryUrl}" style="display:inline-block;background:#e63c23;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:2px;">VER MI ENTRADA</a>
  </div>
  <p style="color:#444;font-size:11px;text-align:center;margin-top:20px;line-height:1.8;">No compartas este QR.<br>Una vez validado en la puerta, no podrá ser reutilizado.</p>
</div></body></html>`,
    });
  } catch (e) {
    console.error("[approve] email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
