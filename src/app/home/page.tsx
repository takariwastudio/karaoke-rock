"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Music,
  Star,
  List,
  LogOut,
  Clock,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SongQueue, Rating, SpotifyTrack } from "@/lib/types";

type Tab = "lista" | "pedir" | "calificar";

// ── Helpers countdown ──────────────────────────────────────
function getRemaining(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function CountdownView({
  startsAt,
  userName,
  onExpire,
}: {
  startsAt: string;
  userName: string;
  onExpire: () => void;
}) {
  const [rem, setRem] = useState(() => getRemaining(startsAt));

  useEffect(() => {
    const t = setInterval(() => {
      const r = getRemaining(startsAt);
      setRem(r);
      if (!r) onExpire();
    }, 1000);
    return () => clearInterval(t);
  }, [startsAt, onExpire]);

  if (!rem) return null;

  const date = new Date(startsAt).toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Date(startsAt).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-r-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-r-red/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-r-amber/5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-6">
        <div>
          <h1 className="font-display text-4xl tracking-[4px]">
            KARAOKE <span className="text-r-red">ROCK</span>
          </h1>
          <p className="text-r-muted text-sm mt-1">Maracay</p>
        </div>
        <p className="text-r-muted text-sm">
          Hola, <span className="text-r-text font-medium">{userName}</span>. El
          evento comienza en...
        </p>
        <div className="grid grid-cols-4 gap-3 w-full">
          {[
            { v: rem.days, l: "Días" },
            { v: rem.hours, l: "Horas" },
            { v: rem.minutes, l: "Min" },
            { v: rem.seconds, l: "Seg" },
          ].map(({ v, l }) => (
            <div key={l} className="card2 text-center py-4">
              <p className="font-display text-4xl text-r-amber leading-none">
                {String(v).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-r-muted uppercase tracking-wider mt-1">
                {l}
              </p>
            </div>
          ))}
        </div>
        <div className="card w-full">
          <p className="text-sm font-medium capitalize">{date}</p>
          <p className="text-r-muted text-sm">{time}</p>
        </div>
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────
function Avatar({
  name,
  url,
  size = 32,
}: {
  name: string;
  url?: string | null;
  size?: number;
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
        fontSize: size * 0.38,
        background: "#e63c23",
      }}
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
    >
      {initials}
    </div>
  );
}

// ── Star rating ────────────────────────────────────────────
function StarRating({
  value,
  interactive = false,
  onRate,
  size = 20,
}: {
  value: number | null;
  interactive?: boolean;
  onRate?: (s: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = interactive
          ? (hovered || value || 0) >= n
          : (value || 0) >= n;
        return (
          <button
            key={n}
            disabled={!interactive}
            onClick={() => onRate?.(n)}
            onMouseEnter={() => interactive && setHovered(n)}
            onMouseLeave={() => interactive && setHovered(0)}
            style={{ background: "none", border: "none", padding: 0 }}
            className={interactive ? "cursor-pointer" : "cursor-default"}
          >
            <Star
              size={size}
              className={filled ? "text-r-star fill-r-star" : "text-r-border"}
              fill={filled ? "#FFD60A" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("lista");
  const [user, setUser] = useState<Profile | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [queue, setQueue] = useState<SongQueue[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

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
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (!profile || profile.is_banned) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }
      setUser(profile);

      const { data: event } = await supabase
        .from("events")
        .select("id, cooldown_minutes, starts_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (event) {
        setEventId(event.id);
        setCooldown(event.cooldown_minutes);
        setStartsAt(event.starts_at ?? null);
        setShowCountdown(
          !!event.starts_at && new Date(event.starts_at).getTime() > Date.now(),
        );
        await loadData(event.id);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`home-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "song_queue",
          filter: `event_id=eq.${eventId}`,
        },
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

  // ── Spinner mientras carga ─────────────────────────────
  if (loading || !user)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // ── Countdown si el evento no ha comenzado ─────────────
  if (showCountdown && startsAt) {
    return (
      <CountdownView
        startsAt={startsAt}
        userName={user.name}
        onExpire={() => setShowCountdown(false)}
      />
    );
  }

  // ── Derived state ──────────────────────────────────────
  const singing = queue.find((e) => e.status === "singing") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting");
  const ratable = [
    ...queue.filter((e) => e.status === "singing"),
    ...queue
      .filter((e) => e.status === "done")
      .sort(
        (a, b) =>
          new Date(b.finished_at!).getTime() -
          new Date(a.finished_at!).getTime(),
      )
      .slice(0, 5),
  ];

  const avgRating = (id: string) => {
    const rs = ratings.filter((r) => r.song_queue_id === id);
    return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
  };
  const myRating = (id: string) =>
    ratings.find((r) => r.song_queue_id === id && r.rater_id === user.id)
      ?.stars ?? null;

  const handleRate = async (song_queue_id: string, stars: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_queue_id, rater_id: user.id, stars }),
    });
  };

  const lastRequest = queue
    .filter((e) => e.user_id === user.id)
    .sort(
      (a, b) =>
        new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
    )[0];
  const cooldownRem = lastRequest
    ? Math.max(
        0,
        Math.ceil(
          (cooldown * 60_000 -
            (Date.now() - new Date(lastRequest.requested_at).getTime())) /
            60_000,
        ),
      )
    : 0;

  return (
    <div className="min-h-screen bg-r-bg flex flex-col w-full max-w-md mx-auto">
      <header className="bg-r-surf border-b border-r-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Image
          src="/HOR_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="h-8 w-auto"
          priority
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/profile")}
            className="hover:opacity-75 transition-opacity"
            title="Ver perfil"
          >
            <Avatar name={user.name} url={user.avatar_url} size={30} />
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="text-r-muted hover:text-r-text transition-colors"
            title="Salir"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {/* ── LISTA ──────────────────────────────────── */}
        {tab === "lista" && (
          <div className="p-4 space-y-4">
            <div className="card relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-r-red to-r-amber" />
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-r-red animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-r-red">
                  Ahora cantando
                </span>
              </div>
              {singing ? (
                <>
                  {singing.album_art && (
                    <Image
                      src={singing.album_art}
                      alt={singing.song_name}
                      width={48}
                      height={48}
                      className="rounded-lg mb-2 object-cover"
                    />
                  )}
                  <p className="font-display text-2xl tracking-wide">
                    {singing.song_name}
                  </p>
                  <p className="text-r-muted text-sm mt-0.5">
                    {singing.artist}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Avatar
                      name={singing.profiles?.name ?? ""}
                      url={singing.profiles?.avatar_url}
                      size={28}
                    />
                    <span className="text-sm font-medium">
                      {singing.profiles?.name}
                    </span>
                    {singing.user_id === user.id && (
                      <span className="badge-singing ml-1">¡Eres tú!</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-r-muted text-sm py-1">
                  Nadie cantando aún ¡pide tu canción!
                </p>
              )}
            </div>

            <p className="section-title">En espera ({waiting.length})</p>
            {waiting.length === 0 ? (
              <div className="card2 text-center py-8 text-r-muted">
                <Music size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Lista vacía</p>
              </div>
            ) : (
              waiting.map((entry, i) => (
                <div
                  key={entry.id}
                  className={clsx(
                    "card flex items-center gap-3",
                    entry.user_id === user.id &&
                      "border-r-amber/40 bg-r-amber/5",
                  )}
                >
                  <span className="font-display text-2xl text-r-muted w-7 text-center shrink-0">
                    {i + 1}
                  </span>
                  <Avatar
                    name={entry.profiles?.name ?? ""}
                    url={entry.profiles?.avatar_url}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.song_name}
                    </p>
                    <p className="text-xs text-r-muted truncate">
                      {entry.artist} · {entry.profiles?.name}
                    </p>
                  </div>
                  {entry.user_id === user.id && (
                    <span className="badge-waiting shrink-0">Tú</span>
                  )}
                </div>
              ))
            )}

            {(() => {
              const pos = waiting.findIndex((e) => e.user_id === user.id);
              if (pos === -1) return null;
              return (
                <div className="card border-r-amber/30 bg-r-amber/5">
                  <p className="text-xs text-r-amber font-semibold">
                    Tu posición
                  </p>
                  <p className="font-display text-4xl text-r-amber mt-1">
                    #{pos + 1}
                  </p>
                  <p className="text-xs text-r-muted mt-1">
                    {pos > 0
                      ? `${pos} persona${pos > 1 ? "s" : ""} antes`
                      : "¡Prepárate!"}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── PEDIR ──────────────────────────────────── */}
        {tab === "pedir" && (
          <PedirTab
            userId={user.id}
            eventId={eventId}
            cooldownRem={cooldownRem}
            onSuccess={() => setTab("lista")}
          />
        )}

        {/* ── CALIFICAR ──────────────────────────────── */}
        {tab === "calificar" && (
          <div className="p-4 space-y-3">
            <p className="section-title">Califica · máximo 5 recientes</p>
            {ratable.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-r-muted">
                <Star size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Nadie ha cantado aún</p>
              </div>
            ) : (
              ratable.map((entry) => {
                const avg = avgRating(entry.id);
                const mine = myRating(entry.id);
                const isSelf = entry.user_id === user.id;
                const votes = ratings.filter(
                  (r) => r.song_queue_id === entry.id,
                ).length;
                return (
                  <div
                    key={entry.id}
                    className={clsx(
                      "card space-y-3",
                      entry.status === "singing" && "border-r-red/30",
                    )}
                  >
                    {entry.status === "singing" && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-r-red animate-pulse" />
                        <span className="text-[10px] uppercase tracking-widest text-r-red font-semibold">
                          Cantando ahora
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={entry.profiles?.name ?? ""}
                        url={entry.profiles?.avatar_url}
                        size={38}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {entry.profiles?.name}
                        </p>
                        <p className="text-xs text-r-muted truncate">
                          {entry.song_name} · {entry.artist}
                        </p>
                      </div>
                      {avg !== null && (
                        <div className="text-right shrink-0">
                          <p className="font-display text-2xl text-r-star leading-none">
                            {avg.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-r-muted">
                            {votes} voto{votes !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-r-border pt-3">
                      {isSelf ? (
                        <p className="text-xs text-r-muted italic">
                          No puedes calificarte a ti mismo
                        </p>
                      ) : mine !== null ? (
                        <div className="flex items-center gap-2">
                          <StarRating value={mine} size={18} />
                          <span className="text-xs text-r-muted">
                            Tu calificación · No editable
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-r-muted mb-1.5">
                            Toca para calificar
                          </p>
                          <StarRating
                            value={null}
                            interactive
                            size={22}
                            onRate={(s) => handleRate(entry.id, s)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-r-surf border-t border-r-border flex z-20">
        {(
          [
            { id: "lista", label: "Lista", icon: List },
            { id: "pedir", label: "Pedir", icon: Mic },
            { id: "calificar", label: "Calificar", icon: Star },
          ] as { id: Tab; label: string; icon: typeof Mic }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              tab === id ? "text-r-red" : "text-r-muted hover:text-r-text",
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Pedir tab ──────────────────────────────────────────────
function PedirTab({
  userId,
  eventId,
  cooldownRem,
  onSuccess,
}: {
  userId: string;
  eventId: string | null;
  cooldownRem: number;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{
    position: number;
    songName: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef<NodeJS.Timeout>();

  const search = (q: string) => {
    setQuery(q);
    setSelected(null);
    clearTimeout(debounce.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.tracks ?? []);
      setSearching(false);
    }, 350);
  };

  const pick = (track: SpotifyTrack) => {
    setSelected(track);
    setQuery(`${track.name} — ${track.artist}`);
    setResults([]);
  };

  const submit = async () => {
    if (!selected) {
      setError("Elige una canción");
      return;
    }
    if (!eventId) {
      setError("No hay evento activo");
      return;
    }
    if (cooldownRem > 0) {
      setError(`Espera ${cooldownRem} min más`);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        artist: selected.artist,
        song_name: selected.name,
        spotify_track_id: selected.id,
        album_art: selected.albumArt,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.message ?? data.error);
      return;
    }
    setSubmitted({ position: data.position, songName: selected.name });
  };

  if (submitted)
    return (
      <div className="p-6 flex flex-col items-center text-center gap-4 pt-10 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-r-green/10 border border-r-green/30 flex items-center justify-center">
          <Mic size={36} className="text-r-green" />
        </div>
        <h2 className="font-display text-4xl tracking-wide">
          ¡Estás en la lista!
        </h2>
        <div className="card w-full">
          <p className="text-r-muted text-sm">{submitted.songName}</p>
          <p className="font-display text-5xl text-r-amber mt-2">
            #{submitted.position}
          </p>
          <p className="text-r-muted text-xs mt-1">en la lista de espera</p>
        </div>
        <button
          className="btn-ghost"
          onClick={() => {
            setSubmitted(null);
            setQuery("");
            setSelected(null);
          }}
        >
          Pedir otra
        </button>
        <button
          className="btn-ghost flex items-center gap-2"
          onClick={onSuccess}
        >
          Ver la cola <ChevronRight size={14} />
        </button>
      </div>
    );

  return (
    <div className="p-4 space-y-4">
      <div className="card">
        <h2 className="font-display text-xl tracking-wide mb-4">
          ¡QUIERO CANTAR!
        </h2>

        {cooldownRem > 0 && (
          <div className="flex items-center gap-2 bg-r-amber/10 border border-r-amber/20 rounded-lg px-3 py-2 text-sm text-r-amber mb-4">
            <Clock size={14} />
            <span>Cooldown activo — {cooldownRem} min restantes</span>
          </div>
        )}

        <div className="relative">
          <label className="label">Buscar en Spotify</label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-r-muted"
            />
            <input
              type="text"
              className="input pl-8 pr-8"
              placeholder="Artista o canción..."
              value={query}
              onChange={(e) => search(e.target.value)}
              disabled={cooldownRem > 0}
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-r-muted hover:text-r-text"
                onClick={() => {
                  setQuery("");
                  setSelected(null);
                  setResults([]);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searching && (
            <p className="text-xs text-r-muted mt-2">Buscando...</p>
          )}

          {results.length > 0 && !selected && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-r-surf2 border border-r-border rounded-xl overflow-hidden shadow-xl z-20 animate-fade-in">
              {results.map((track) => (
                <button
                  key={track.id}
                  onClick={() => pick(track)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-r-border transition-colors text-left border-b border-r-border last:border-0"
                >
                  {track.albumArt && (
                    <Image
                      src={track.albumArt}
                      alt={track.album}
                      width={36}
                      height={36}
                      className="rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs text-r-muted truncate">
                      {track.artist} · {track.album}
                    </p>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-r-muted shrink-0 ml-auto"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-3 bg-r-red/10 border border-r-red/20 rounded-lg px-3 py-2.5 flex items-center gap-3 animate-fade-in">
            {selected.albumArt && (
              <Image
                src={selected.albumArt}
                alt={selected.album}
                width={40}
                height={40}
                className="rounded object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-r-muted">{selected.artist}</p>
            </div>
          </div>
        )}

        {error && <p className="text-r-red text-xs mt-2">{error}</p>}

        <button
          className="btn-primary mt-4"
          onClick={submit}
          disabled={!selected || cooldownRem > 0 || submitting}
        >
          {submitting ? "ENVIANDO..." : "AGREGAR A LA LISTA"}
        </button>
      </div>
    </div>
  );
}
