"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Mic,
  SkipForward,
  XCircle,
  Play,
  Users,
  Music,
  Star,
  Ban,
  BarChart2,
  Settings,
  RefreshCw,
  Lock,
  AlertTriangle,
  Trophy,
  Flame,
  Ghost,
  UserX,
  Calendar,
  Copy,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SongQueue, Rating, Event } from "@/lib/types";

const ADMIN_KEY = "kr_admin";

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
        background: "#e63c23",
        fontSize: size * 0.38,
      }}
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
    >
      {initials}
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ action: "ping", event_id: "" }),
    });
    if (res.status === 401) {
      setErr("Password incorrecto");
      return;
    }
    sessionStorage.setItem(ADMIN_KEY, pw);
    onLogin(pw);
  };
  return (
    <div className="min-h-screen bg-r-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <h1 className="font-display text-3xl tracking-[3px] text-center mb-8">
          ADMIN <span className="text-r-red">PANEL</span>
        </h1>
        <div className="card space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-r-red/10 mx-auto">
            <Lock size={20} className="text-r-red" />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {err && <p className="text-r-red text-xs mt-1">{err}</p>}
          </div>
          <button className="btn-primary" onClick={submit}>
            ENTRAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const supabase = createClient();
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [queue, setQueue] = useState<SongQueue[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tab, setTab] = useState<"dashboard" | "usuarios" | "config">(
    "dashboard",
  );
  const [eventDateTime, setEventDateTime] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_KEY);
    if (stored) {
      setPw(stored);
      setAuthed(true);
    }
  }, []);

  const load = useCallback(async () => {
    const [evRes, qRes, rRes, uRes] = await Promise.all([
      fetch("/api/admin/event").then((r) => r.json()),
      supabase
        .from("song_queue")
        .select("*, profiles!user_id(name, avatar_url)")
        .in("status", ["waiting", "singing", "done", "noshow"])
        .order("requested_at", { ascending: true }),
      supabase.from("ratings").select("*"),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);
    if (evRes.event) {
      setEvent(evRes.event);
      if (evRes.event.starts_at) {
        const d = new Date(evRes.event.starts_at);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEventDateTime(local);
      }
    }
    if (qRes.data) setQueue(qRes.data);
    if (rRes.data) setRatings(rRes.data);
    if (uRes.data) setUsers(uRes.data);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  useEffect(() => {
    if (!authed || !event) return;
    const ch = supabase
      .channel("admin-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "song_queue" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [authed, event, load]);

  const djAction = async (action: string, extra?: object) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ action, event_id: event?.id, ...extra }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[djAction] falló:", action, res.status, err);
      if (res.status === 401)
        showToast("Password incorrecto o sesión expirada.", "err");
      return;
    }
    await load();
  };

  const saveCooldown = async (minutes: number) => {
    if (!event?.id) {
      showToast("Evento no cargado. Recarga la página.", "err");
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({
        action: "set_cooldown",
        event_id: event.id,
        cooldown_minutes: minutes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEvent((ev) => (ev ? { ...ev, cooldown_minutes: minutes } : ev));
      showToast(`Cooldown actualizado a ${minutes} min ✓`);
    } else {
      showToast(
        `Error ${res.status}: ${data?.error ?? "Revisa la consola"}`,
        "err",
      );
      console.error("[saveCooldown]", res.status, data);
    }
  };

  const saveEventTime = async (clear = false) => {
    if (!event?.id) {
      showToast("Evento no cargado", "err");
      return;
    }
    const starts_at = clear
      ? null
      : eventDateTime
        ? new Date(eventDateTime).toISOString()
        : null;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({
        action: "set_event_time",
        event_id: event.id,
        starts_at,
      }),
    });
    if (res.ok) {
      setEvent((ev) => (ev ? { ...ev, starts_at } : ev));
      showToast(clear ? "Countdown eliminado" : "Fecha del evento guardada ✓");
    } else {
      showToast("Error al guardar la fecha", "err");
    }
  };

  if (!authed)
    return (
      <AdminLogin
        onLogin={(p) => {
          setPw(p);
          setAuthed(true);
        }}
      />
    );

  const singing = queue.find((e) => e.status === "singing") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting");
  const done = queue.filter((e) => e.status === "done");

  const avgRating = (id: string) => {
    const rs = ratings.filter((r) => r.song_queue_id === id);
    return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
  };

  const songCount: Record<
    string,
    { name: string; artist: string; count: number }
  > = {};
  queue.forEach((e) => {
    const k = `${e.artist}|${e.song_name}`;
    if (!songCount[k])
      songCount[k] = { name: e.song_name, artist: e.artist, count: 0 };
    songCount[k].count++;
  });
  const topSong = Object.values(songCount).sort((a, b) => b.count - a.count)[0];

  const userActivity: Record<string, { prof: Profile; count: number }> = {};
  queue.forEach((e) => {
    const prof = users.find((u) => u.id === e.user_id);
    if (!prof) return;
    if (!userActivity[e.user_id]) userActivity[e.user_id] = { prof, count: 0 };
    userActivity[e.user_id].count++;
  });
  const topUser = Object.values(userActivity).sort(
    (a, b) => b.count - a.count,
  )[0];

  const ghostUsers = users.filter(
    (u) => !queue.some((e) => e.user_id === u.id),
  );
  const noshowUsers = users.filter((u) => {
    const entries = queue.filter((e) => e.user_id === u.id);
    return entries.length > 0 && entries.every((e) => e.status === "noshow");
  });

  const topRated = done
    .map((e) => ({
      entry: e,
      avg: avgRating(e.id) ?? 0,
      votes: ratings.filter((r) => r.song_queue_id === e.id).length,
    }))
    .filter((r) => r.votes > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "config", label: "Config", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-r-bg flex flex-col">
      <header className="bg-r-surf border-b border-r-border px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-display text-xl tracking-[3px]">
          ADMIN <span className="text-r-red">PANEL</span>
        </h1>
        <div className="flex items-center gap-3">
          {event && (
            <span className="text-xs text-r-muted border border-r-border px-2 py-1 rounded-lg">
              {event.name}
            </span>
          )}
          <button onClick={load} className="text-r-muted hover:text-r-text p-1">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(ADMIN_KEY);
              setAuthed(false);
            }}
            className="text-xs text-r-muted hover:text-r-text border border-r-border rounded-lg px-2 py-1"
          >
            Salir
          </button>
        </div>
      </header>

      {/* URL shortcuts */}
      {(() => {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const links = [
          { label: "Home", path: "/home" },
          { label: "Stage", path: "/stage" },
          { label: "Admin", path: "/admin" },
        ];
        return (
          <div className="px-8 py-2 bg-r-bg border-b border-r-border flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-r-muted font-semibold shrink-0">
              Links
            </span>
            {links.map(({ label, path }) => {
              const url = `${origin}${path}`;
              return (
                <div
                  key={path}
                  className="flex items-center gap-1 bg-r-surf border border-r-border rounded-lg px-2.5 py-1"
                >
                  <span className="text-xs text-r-muted">{label}</span>
                  <span className="text-[11px] text-r-border mx-1">·</span>
                  <span className="text-[11px] text-r-muted font-mono truncate max-w-[160px]">
                    {url}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      showToast(`${label} copiado ✓`);
                    }}
                    className="ml-1.5 text-r-muted hover:text-r-text transition-colors"
                    title="Copiar"
                  >
                    <Copy size={11} />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-r-muted hover:text-r-text transition-colors"
                    title="Abrir"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl animate-slide-up",
            toast.type === "ok"
              ? "bg-r-green/20 border border-r-green/40 text-r-green"
              : "bg-r-red/20 border border-r-red/40 text-r-red",
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* DJ Controls — dos columnas en desktop */}
      <div className="px-8 py-5 border-b border-r-border bg-r-surf/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cantante actual */}
          <div className="card relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-r-red to-r-amber" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      singing ? "bg-r-red animate-pulse" : "bg-r-border",
                    )}
                  />
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-r-red">
                    {singing ? "Ahora cantando" : "Sin cantante activo"}
                  </span>
                </div>
                {singing ? (
                  <div className="flex items-center gap-3">
                    {singing.album_art && (
                      <Image
                        src={singing.album_art}
                        alt=""
                        width={52}
                        height={52}
                        className="rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-display text-2xl tracking-wide">
                        {singing.song_name}
                      </p>
                      <p className="text-r-muted text-sm">{singing.artist}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Avatar
                          name={singing.profiles?.name ?? ""}
                          url={singing.profiles?.avatar_url}
                          size={22}
                        />
                        <span className="text-sm">
                          {singing.profiles?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-r-muted">
                    {waiting.length > 0
                      ? `${waiting.length} en espera`
                      : "Cola vacía"}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!singing && waiting.length > 0 && (
                  <button
                    onClick={() => djAction("start")}
                    className="flex items-center gap-1.5 bg-r-green/15 border border-r-green/30 text-r-green px-4 py-2 rounded-lg text-sm hover:bg-r-green/25 transition-colors"
                  >
                    <Play size={14} /> Iniciar
                  </button>
                )}
                {singing && (
                  <>
                    <button
                      onClick={() => djAction("next")}
                      className="flex items-center gap-1.5 bg-r-red/15 border border-r-red/30 text-r-red px-4 py-2 rounded-lg text-sm hover:bg-r-red/25 transition-colors"
                    >
                      <SkipForward size={14} /> Siguiente
                    </button>
                    <button
                      onClick={() => djAction("noshow")}
                      className="flex items-center gap-1.5 text-r-muted border border-r-border px-4 py-2 rounded-lg text-sm hover:text-r-text transition-colors"
                    >
                      <XCircle size={14} /> No Show
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cola próximos */}
          <div className="card">
            <p className="section-title">
              Próximos en la lista ({waiting.length})
            </p>
            {waiting.length === 0 ? (
              <p className="text-r-muted text-sm">Cola vacía</p>
            ) : (
              <div className="space-y-2.5 max-h-40 overflow-y-auto">
                {waiting.slice(0, 8).map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3 group">
                    <span className="font-display text-lg text-r-muted w-5 text-center shrink-0">
                      {i + 1}
                    </span>
                    <Avatar
                      name={e.profiles?.name ?? ""}
                      url={e.profiles?.avatar_url}
                      size={26}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.profiles?.name}
                      </p>
                      <p className="text-xs text-r-muted truncate">
                        {e.song_name} · {e.artist}
                      </p>
                    </div>
                    <button
                      onClick={() => djAction("remove", { song_id: e.id })}
                      className="opacity-0 group-hover:opacity-100 text-r-muted hover:text-r-red text-xl leading-none transition-all"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="px-8 py-3 flex gap-2 border-b border-r-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
              tab === id
                ? "bg-r-red/15 text-r-red border border-r-red/30"
                : "text-r-muted border border-r-border hover:text-r-text",
            )}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="xl:col-span-2 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Usuarios",
                    value: users.length,
                    color: "text-r-amber",
                    icon: Users,
                  },
                  {
                    label: "Pedidas",
                    value: queue.length,
                    color: "text-r-red",
                    icon: Music,
                  },
                  {
                    label: "Cantaron",
                    value: done.length,
                    color: "text-r-green",
                    icon: Mic,
                  },
                  {
                    label: "No shows",
                    value: queue.filter((e) => e.status === "noshow").length,
                    color: "text-r-muted",
                    icon: XCircle,
                  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="card2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={11} className={color} />
                      <span className="text-[10px] uppercase tracking-widest text-r-muted font-semibold">
                        {label}
                      </span>
                    </div>
                    <p
                      className={clsx(
                        "font-display text-4xl leading-none",
                        color,
                      )}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {topSong && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={14} className="text-r-red" />
                    <span className="section-title mb-0">
                      Canción más pedida
                    </span>
                  </div>
                  <p className="font-display text-2xl tracking-wide">
                    {topSong.name}
                  </p>
                  <p className="text-sm text-r-muted">
                    {topSong.artist} · pedida {topSong.count} vez
                    {topSong.count > 1 ? "es" : ""}
                  </p>
                </div>
              )}

              {topUser && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={14} className="text-r-amber" />
                    <span className="section-title mb-0">
                      Usuario más activo
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={topUser.prof.name}
                      url={topUser.prof.avatar_url}
                      size={36}
                    />
                    <div>
                      <p className="font-semibold">{topUser.prof.name}</p>
                      <p className="text-sm text-r-muted">
                        {topUser.count} canción(es) pedida(s)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(ghostUsers.length > 0 || noshowUsers.length > 0) && (
                <div className="card space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-r-amber" />
                    <span className="section-title mb-0">Sin actividad</span>
                  </div>
                  {ghostUsers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Ghost
                        size={14}
                        className="text-r-muted mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          Registrados sin pedir ({ghostUsers.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ghostUsers.map((u) => (
                            <span
                              key={u.id}
                              className="text-[11px] bg-r-surf2 border border-r-border rounded px-1.5 py-0.5 text-r-muted"
                            >
                              {u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {noshowUsers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <UserX
                        size={14}
                        className="text-r-muted mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          Piden pero no aparecen ({noshowUsers.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {noshowUsers.map((u) => (
                            <span
                              key={u.id}
                              className="text-[11px] bg-r-surf2 border border-r-border rounded px-1.5 py-0.5 text-r-muted"
                            >
                              {u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna derecha: Top cantantes */}
            <div>
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={14} className="text-r-amber" />
                  <span className="section-title mb-0">Top cantantes</span>
                </div>
                {topRated.length === 0 ? (
                  <p className="text-r-muted text-sm">Nadie calificado aún</p>
                ) : (
                  <div className="space-y-4">
                    {topRated.map(({ entry, avg, votes }, i) => (
                      <div key={entry.id} className="flex items-center gap-3">
                        <span
                          className={clsx(
                            "font-display text-2xl w-6 text-center shrink-0",
                            i === 0
                              ? "text-r-amber"
                              : i === 1
                                ? "text-[#aaa]"
                                : i === 2
                                  ? "text-[#a05c1a]"
                                  : "text-r-muted",
                          )}
                        >
                          {i + 1}
                        </span>
                        <Avatar
                          name={entry.profiles?.name ?? ""}
                          url={entry.profiles?.avatar_url}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.profiles?.name}
                          </p>
                          <p className="text-xs text-r-muted truncate">
                            {entry.song_name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-xl text-r-star leading-none">
                            {avg.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-r-muted">
                            {votes} votos
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Usuarios */}
        {tab === "usuarios" && (
          <div className="space-y-2">
            <p className="section-title">{users.length} usuarios registrados</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {users.map((u) => {
                const entries = queue.filter((e) => e.user_id === u.id);
                return (
                  <div
                    key={u.id}
                    className={clsx(
                      "card flex items-center gap-3",
                      u.is_banned && "opacity-60 border-r-red/30",
                    )}
                  >
                    <Avatar name={u.name} url={u.avatar_url} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{u.name}</p>
                        {u.is_banned && (
                          <span className="badge-noshow">Baneado</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[11px] text-r-muted flex-wrap">
                        <span>{entries.length} pedidas</span>
                        {entries.filter((e) => e.status === "done").length >
                          0 && (
                          <span className="text-r-green">
                            ·{" "}
                            {entries.filter((e) => e.status === "done").length}{" "}
                            cantó
                          </span>
                        )}
                        {entries.filter((e) => e.status === "noshow").length >
                          0 && (
                          <span className="text-r-red">
                            ·{" "}
                            {
                              entries.filter((e) => e.status === "noshow")
                                .length
                            }{" "}
                            no-show
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        djAction(u.is_banned ? "unban" : "ban", {
                          user_id: u.id,
                        })
                      }
                      className={clsx(
                        "shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                        u.is_banned
                          ? "border-r-green/30 text-r-green hover:bg-r-green/10"
                          : "border-r-border text-r-muted hover:border-r-red/40 hover:text-r-red",
                      )}
                    >
                      <Ban size={12} /> {u.is_banned ? "Desbanear" : "Banear"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Config */}
        {tab === "config" && event && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cooldown */}
            <div className="card">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Settings size={15} className="text-r-red" /> Cooldown entre
                canciones
              </h3>
              <p className="text-xs text-r-muted mb-6">
                Tiempo mínimo que debe esperar un usuario para pedir otra
                canción
              </p>
              <div className="flex items-center gap-4 mb-5">
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={event.cooldown_minutes}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      cooldown_minutes: Number(e.target.value),
                    })
                  }
                  onMouseUp={(e) =>
                    saveCooldown(Number((e.target as HTMLInputElement).value))
                  }
                  onTouchEnd={(e) =>
                    saveCooldown(Number((e.target as HTMLInputElement).value))
                  }
                  className="flex-1 accent-r-red"
                />
                <span className="font-display text-5xl text-r-amber w-20 text-right leading-none">
                  {event.cooldown_minutes}
                </span>
                <span className="text-r-muted text-sm">min</span>
              </div>
              <div className="flex gap-2 flex-wrap mb-5">
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => saveCooldown(m)}
                    className={clsx(
                      "text-sm px-4 py-2 rounded-lg border transition-colors",
                      event.cooldown_minutes === m
                        ? "bg-r-red/15 border-r-red/30 text-r-red"
                        : "border-r-border text-r-muted hover:text-r-text",
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <button
                className="btn-ghost w-full"
                onClick={() => saveCooldown(event.cooldown_minutes)}
              >
                Guardar cooldown
              </button>
            </div>

            {/* Fecha del evento */}
            <div className="card flex flex-col">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Calendar size={15} className="text-r-amber" /> Próximo evento
              </h3>
              <p className="text-xs text-r-muted mb-6">
                Activa un countdown en el home hasta que llegue la hora. Quítalo
                si el evento empieza de sorpresa o para pruebas.
              </p>

              {event.starts_at && (
                <div className="mb-4 bg-r-amber/10 border border-r-amber/20 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-r-muted">Countdown activo para</p>
                  <p className="text-sm font-medium text-r-amber mt-0.5">
                    {new Date(event.starts_at).toLocaleDateString("es-VE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {" · "}
                    {new Date(event.starts_at).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              <div className="flex-1">
                <label className="label">Fecha y hora de inicio</label>
                <input
                  type="datetime-local"
                  className="input text-sm"
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                />
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => saveEventTime()}
                >
                  Guardar fecha
                </button>
                <button
                  onClick={() => {
                    setEventDateTime("");
                    saveEventTime(true);
                  }}
                  className="flex-1 text-sm text-r-muted hover:text-r-red border border-r-border hover:border-r-red/30 rounded-xl py-2 transition-colors"
                >
                  Quitar countdown
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
