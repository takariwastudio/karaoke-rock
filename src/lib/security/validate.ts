import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const uuid = z.string().uuid();

// Quita caracteres de control y espacios sobrantes
export const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(1).max(max));

const httpsFrom = (hosts: RegExp) =>
  z
    .string()
    .url()
    .max(500)
    .refine((u) => {
      const url = new URL(u);
      return url.protocol === "https:" && hosts.test(url.hostname);
    }, "Host no permitido");

export const albumArtUrl = httpsFrom(/^i\.scdn\.co$/);
export const avatarUrl = httpsFrom(/(^|\.)googleusercontent\.com$/);
export const spotifyId = z.string().regex(/^[A-Za-z0-9]{1,40}$/);

export const songSchema = z.object({
  artist: cleanText(200),
  song_name: cleanText(200),
  spotify_track_id: spotifyId.nullish(),
  album_art: albumArtUrl.nullish(),
});

export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      error: NextResponse.json({ error: "JSON inválido" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    return {
      error: NextResponse.json(
        {
          error: "Datos inválidos",
          field: String(parsed.error.issues[0]?.path[0] ?? ""),
        },
        { status: 400 },
      ),
    };
  return { data: parsed.data };
}

// Escapa comodines de LIKE/ILIKE (% _ \) para comparar texto literal
export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Escapa texto para interpolarlo en HTML (emails)
export function escapeHtml(s: unknown) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
