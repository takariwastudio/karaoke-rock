import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { rateLimit } from "@/lib/security/rate-limit";
import { uuid } from "@/lib/security/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const limited = rateLimit(req, "ticket-qr", 30, 60_000);
  if (limited) return limited;

  if (!uuid.safeParse(params.token).success)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://karaokerock.com.ve";
  const entryUrl = `${baseUrl}/entry/${params.token}`;

  const buffer = await QRCode.toBuffer(entryUrl, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1a1a1a", light: "#f5f5f5" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
