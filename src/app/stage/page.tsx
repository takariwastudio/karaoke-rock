"use client";
import { useState, useEffect, useCallback } from "react";
import { Trophy, Mic } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { SongQueue, Rating } from "@/lib/types";

function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return (
    <span
      style={{ color: "#f6bc3f", letterSpacing: "0.1em", fontSize: "1.2rem" }}
    >
      {"★".repeat(n)}
      <span style={{ opacity: 0.25 }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Avatar({
  name,
  url,
  size,
}: {
  name: string;
  url?: string | null;
  size: number;
}) {
  if (url)
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#e63c23",
        fontSize: size * 0.38,
      }}
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
    >
      {initials}
    </div>
  );
}

export default function StagePage() {
  const supabase = createClient();
  const [eventId, setEventId] = useState<string | null>(null);
  const [queue, setQueue] = useState<SongQueue[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [clock, setClock] = useState("");

  const loadData = useCallback(
    async (eid: string) => {
      const [qRes, rRes] = await Promise.all([
        supabase
          .from("song_queue")
          .select("*, profiles!user_id(name, avatar_url)")
          .eq("event_id", eid)
          .in("status", ["waiting", "singing", "done"])
          .order("requested_at", { ascending: true }),
        supabase.from("ratings").select("*"),
      ]);
      if (qRes.data) setQueue(qRes.data);
      if (rRes.data) setRatings(rRes.data);
    },
    [supabase],
  );

  useEffect(() => {
    const init = async () => {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!event) return;
      setEventId(event.id);
      await loadData(event.id);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel("stage-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "song_queue" },
        () => loadData(eventId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => loadData(eventId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, loadData, supabase]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("es-VE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const singing = queue.find((e) => e.status === "singing") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting").slice(0, 7);

  const avgRating = (id: string) => {
    const rs = ratings.filter((r) => r.song_queue_id === id);
    return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : 0;
  };

  const ranking = queue
    .filter((e) => e.status === "done")
    .map((e) => ({
      entry: e,
      avg: avgRating(e.id),
      votes: ratings.filter((r) => r.song_queue_id === e.id).length,
    }))
    .filter((r) => r.votes > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://karaokerock.com.ve";

  return (
    <div
      className="h-screen flex flex-col overflow-hidden select-none"
      style={{
        background: "#1a1a1a",
        color: "#f5f5f5",
        fontFamily: "var(--font-inter)",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-10 py-3 shrink-0"
        style={{ background: "#111111", borderBottom: "2px solid #e63c23" }}
      >
        <Image
          src="/HOR_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="h-10 w-auto object-contain"
        />
        <span
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 26,
            color: "#666666",
          }}
        >
          {clock}
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 flex min-h-0">
        {/* ── Izquierda: Cola ─────────────────────────────── */}
        <div
          className="flex-1 flex flex-col p-10 gap-8 min-h-0"
          style={{ borderRight: "1px solid #2e2e2e" }}
        >
          {/* Ahora cantando */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-5">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#e63c23",
                  animation: "pulse 2s infinite",
                  display: "block",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#e63c23",
                }}
              >
                Ahora en el micrófono
              </span>
            </div>

            {singing ? (
              <>
                {singing.album_art && (
                  <Image
                    src={singing.album_art}
                    alt={singing.song_name}
                    width={72}
                    height={72}
                    className="rounded-xl mb-4 object-cover"
                  />
                )}
                <p
                  style={{
                    fontFamily: "var(--font-bebas)",
                    lineHeight: 1,
                    fontSize: "clamp(3.5rem, 8vw, 7rem)",
                    letterSpacing: 2,
                    color: "#f5f5f5",
                  }}
                >
                  {singing.song_name}
                </p>
                <p
                  style={{ fontSize: "1.6rem", color: "#aaaaaa", marginTop: 8 }}
                >
                  {singing.artist}
                </p>
                <div className="flex items-center gap-3 mt-6">
                  <Avatar
                    name={singing.profiles?.name ?? ""}
                    url={singing.profiles?.avatar_url}
                    size={52}
                  />
                  <p
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      color: "#f5f5f5",
                    }}
                  >
                    {singing.profiles?.name}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Mic size={48} style={{ color: "#333333", flexShrink: 0 }} />
                  <p
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "clamp(3rem, 6vw, 5.5rem)",
                      color: "#444444",
                      letterSpacing: 4,
                      lineHeight: 1,
                    }}
                  >
                    ESPERANDO
                  </p>
                </div>
                <p style={{ color: "#666666", fontSize: "1.3rem" }}>
                  Escanea el QR para pedir tu canción
                </p>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4 shrink-0">
            <div
              className="flex-1"
              style={{ height: 1, background: "#333333" }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#666666",
              }}
            >
              A continuación
            </span>
            <div
              className="flex-1"
              style={{ height: 1, background: "#333333" }}
            />
          </div>

          {/* Lista de espera */}
          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            {waiting.length === 0 ? (
              <p style={{ color: "#555555", fontSize: "1.2rem" }}>
                La lista está vacía
              </p>
            ) : (
              waiting.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-5">
                  <span
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "2.4rem",
                      color: i === 0 ? "#e63c23" : "#666666",
                      width: 36,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <Avatar
                    name={entry.profiles?.name ?? ""}
                    url={entry.profiles?.avatar_url}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        color: "#f5f5f5",
                      }}
                      className="truncate"
                    >
                      {entry.profiles?.name}
                    </p>
                    <p
                      style={{ color: "#888888", fontSize: "1.05rem" }}
                      className="truncate"
                    >
                      {entry.song_name} · {entry.artist}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Derecha: Ranking + QR ────────────────────────── */}
        <div
          style={{ width: "36%" }}
          className="flex flex-col p-10 gap-6 min-h-0"
        >
          <div className="flex items-center gap-2 shrink-0">
            <Trophy size={16} style={{ color: "#f6bc3f" }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#f6bc3f",
              }}
            >
              Ranking de la noche
            </span>
          </div>

          {ranking.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p
                style={{
                  color: "#555555",
                  fontSize: "1.2rem",
                  textAlign: "center",
                  lineHeight: 2,
                }}
              >
                El ranking aparece cuando
                <br />
                alguien termine de cantar
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-5 min-h-0 overflow-hidden">
              {ranking.map(({ entry, avg, votes }, i) => (
                <div key={entry.id} className="flex items-center gap-4">
                  <span
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "2.2rem",
                      width: 32,
                      textAlign: "center",
                      flexShrink: 0,
                      color:
                        i === 0
                          ? "#f6bc3f"
                          : i === 1
                            ? "#cccccc"
                            : i === 2
                              ? "#cd7f32"
                              : "#777777",
                    }}
                  >
                    {i + 1}
                  </span>
                  <Avatar
                    name={entry.profiles?.name ?? ""}
                    url={entry.profiles?.avatar_url}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 600,
                        color: "#f5f5f5",
                      }}
                      className="truncate"
                    >
                      {entry.profiles?.name}
                    </p>
                    <p
                      style={{ color: "#888888", fontSize: "0.95rem" }}
                      className="truncate"
                    >
                      {entry.song_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Stars value={avg} />
                      <span style={{ color: "#777777", fontSize: "0.85rem" }}>
                        {avg.toFixed(1)} · {votes} voto{votes !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* QR */}
          <div
            className="shrink-0 flex flex-col items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #333333" }}
          >
            <div
              style={{ padding: 14, background: "#f5f5f5", borderRadius: 14 }}
            >
              <QRCodeSVG
                value={`${origin}/home`}
                size={140}
                bgColor="#f5f5f5"
                fgColor="#1a1a1a"
                level="M"
              />
            </div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#888888",
                textAlign: "center",
              }}
            >
              Escanea para pedir y votar
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
