import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/security/user";
import { rateLimit } from "@/lib/security/rate-limit";

let token: { value: string; expires: number } | null = null;

async function getToken() {
  if (token && Date.now() < token.expires) return token.value;
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  token = {
    value: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return token.value;
}

// Solo usuarios logueados: evita que terceros usen nuestra cuota de Spotify
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const limited = rateLimit(req, "spotify", 60, 60_000, auth.user.id);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return NextResponse.json({ tracks: [] });

  try {
    const t = await getToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8&market=VE`,
      { headers: { Authorization: `Bearer ${t}` } },
    );
    const data = await res.json();
    const tracks = (data.tracks?.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      album: item.album.name,
      albumArt: item.album.images[0]?.url ?? null,
    }));
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ error: "Error buscando" }, { status: 500 });
  }
}
