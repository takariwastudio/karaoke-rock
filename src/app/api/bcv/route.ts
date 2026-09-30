import { NextResponse } from "next/server";

export async function GET() {
  // Fuente 1: DolarAPI (API venezolana confiable)
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    const rate = parseFloat(data?.promedio ?? data?.ventaAlCliente);
    if (!isNaN(rate) && rate > 1)
      return NextResponse.json({
        rate,
        source: "dolarapi",
        timestamp: new Date().toISOString(),
      });
  } catch {
    /* siguiente fuente */
  }

  // Fuente 2: PyDolarVe
  try {
    const res = await fetch("https://pydolarve.org/api/v1/dollar?monitor=bcv", {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    const rate = parseFloat(data?.price);
    if (!isNaN(rate) && rate > 1)
      return NextResponse.json({
        rate,
        source: "pydolarve",
        timestamp: new Date().toISOString(),
      });
  } catch {
    /* siguiente fuente */
  }

  // Fuente 3: Scraping directo al BCV (último recurso)
  try {
    const res = await fetch("https://www.bcv.org.ve/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const match = html.match(
      /id="dolar"[\s\S]{0,600}<strong>([\d,.]+)<\/strong>/i,
    );
    if (match?.[1]) {
      const rate = parseFloat(match[1].replace(",", "."));
      if (!isNaN(rate) && rate > 1)
        return NextResponse.json({
          rate,
          source: "bcv",
          timestamp: new Date().toISOString(),
        });
    }
  } catch {
    /* falló */
  }

  return NextResponse.json(
    { error: "No se pudo obtener la tasa de ninguna fuente" },
    { status: 422 },
  );
}
