"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart2,
  Users,
  Settings,
  RefreshCw,
  Lock,
  Copy,
  ExternalLink,
  Ticket,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { DJControls } from "./_components/DJControls";
import { DashboardTab } from "./_components/DashboardTab";
import { UsuariosTab } from "./_components/UsuariosTab";
import { EntradasTab } from "./_components/EntradasTab";
import { ConfigTab } from "./_components/ConfigTab";
import type { Profile, SongQueue, Rating, Event } from "@/lib/types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      setErr(
        res.status === 429
          ? "Demasiados intentos. Espera unos minutos."
          : "Password incorrecto",
      );
      return;
    }
    setPw("");
    onLogin();
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
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [queue, setQueue] = useState<SongQueue[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tab, setTab] = useState<
    "dashboard" | "usuarios" | "entradas" | "config"
  >("dashboard");
  const [eventDateTime, setEventDateTime] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketTab, setTicketTab] = useState<
    "pending" | "approved" | "used" | "rejected"
  >("pending");
  const [bcvLoading, setBcvLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bsPrice, setBsPrice] = useState("");
  const [usdtPrice, setUsdtPrice] = useState("5");
  const [bcvRate, setBcvRate] = useState("");
  const [closing, setClosing] = useState(false);
  const [historical, setHistorical] = useState<any[]>([]);
  const [histWinners, setHistWinners] = useState<any[]>([]);

  const dateInitialized = useRef(false);
  const priceInitialized = useRef(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Restaurar sesión (cookie HttpOnly) ───────────────────
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authed))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthed(false);
  };

  const load = useCallback(async () => {
    const [evRes, qRes, rRes, uRes] = await Promise.all([
      fetch(`/api/admin/event?_=${Date.now()}`, { cache: "no-store" }).then(
        (r) => r.json(),
      ),
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
      // Auto-limpiar countdown si la fecha ya pasó
      if (
        evRes.event.starts_at &&
        new Date(evRes.event.starts_at).getTime() < Date.now()
      ) {
        await fetch("/api/admin", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            action: "set_event_time",
            event_id: evRes.event.id,
            starts_at: null,
          }),
        });
        evRes.event.starts_at = null;
      }

      setEvent(evRes.event);

      if (!priceInitialized.current) {
        priceInitialized.current = true;
        setBsPrice(evRes.event.ticket_price_bs?.toString() || "");
        setUsdtPrice(evRes.event.ticket_price_usdt?.toString() || "5");
        setBcvRate(evRes.event.bcv_rate?.toString() || "");
      }

      if (!dateInitialized.current) {
        dateInitialized.current = true;
        if (
          evRes.event.starts_at &&
          new Date(evRes.event.starts_at).getTime() > Date.now()
        ) {
          const d = new Date(evRes.event.starts_at);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setEventDateTime(local);
        } else {
          setEventDateTime("");
        }
      }
    }
    if (qRes.data)
      setQueue(qRes.data.filter((q: any) => q.event_id === evRes.event?.id));
    if (rRes.data) setRatings(rRes.data);
    if (uRes.data) setUsers(uRes.data);
  }, [supabase]);

  const loadTickets = useCallback(async () => {
    if (!event) return;
    const res = await fetch(
      `/api/tickets?event_id=${encodeURIComponent(event.id)}`,
      { cache: "no-store" },
    );
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    if (data.tickets) setTickets(data.tickets);
  }, [event]);

  const loadHistorical = useCallback(async () => {
    const res = await fetch("/api/rankings");
    const data = await res.json();
    if (data.historical) setHistorical(data.historical);
    if (data.winners) setHistWinners(data.winners);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);
  useEffect(() => {
    if (authed && event) loadTickets();
  }, [authed, event, loadTickets]);
  useEffect(() => {
    if (authed) loadHistorical();
  }, [authed, loadHistorical]);

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
    // tickets tiene datos personales y RLS lo bloquea para el cliente:
    // se consulta vía API admin cada 20 s en lugar de Realtime
    const t = setInterval(loadTickets, 20_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, [authed, event, load, loadTickets, supabase]);

  const djAction = async (action: string, extra?: object) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ action, event_id: event?.id, ...extra }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        showToast("Sesión expirada. Vuelve a entrar.", "err");
        setAuthed(false);
      }
      return;
    }
    await load();
  };

  const saveCooldown = async (minutes: number) => {
    if (!event?.id) {
      showToast("Evento no cargado.", "err");
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        action: "set_cooldown",
        event_id: event.id,
        cooldown_minutes: minutes,
      }),
    });
    if (res.ok) {
      setEvent((ev) => (ev ? { ...ev, cooldown_minutes: minutes } : ev));
      showToast(`Cooldown actualizado a ${minutes} min ✓`);
    } else showToast("Error al guardar cooldown", "err");
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
      headers: JSON_HEADERS,
      body: JSON.stringify({
        action: "set_event_time",
        event_id: event.id,
        starts_at,
      }),
    });
    if (res.ok) {
      setEvent((ev) => (ev ? { ...ev, starts_at } : ev));
      if (clear) {
        dateInitialized.current = false;
        setEventDateTime("");
      }
      showToast(clear ? "Countdown eliminado" : "Fecha del evento guardada ✓");
    } else showToast("Error al guardar la fecha", "err");
  };

  const fetchBcv = async () => {
    setBcvLoading(true);
    const res = await fetch("/api/bcv");
    const data = await res.json();
    setBcvLoading(false);
    if (!data.rate) {
      showToast("No se pudo obtener la tasa del BCV", "err");
      return;
    }
    const rate = data.rate;
    const usdtVal = parseFloat(usdtPrice) || 5;
    const bsVal = Math.round(rate * usdtVal);
    setBcvRate(rate.toString());
    setBsPrice(bsVal.toString());
    setEvent((ev) =>
      ev ? { ...ev, bcv_rate: rate, ticket_price_bs: bsVal } : ev,
    );
    showToast(
      `Tasa BCV: ${rate} Bs/USD · Entrada: ${bsVal.toLocaleString("es-VE")} Bs ✓`,
    );
  };

  const savePrecios = async () => {
    if (!event?.id) {
      showToast("Evento no cargado", "err");
      return;
    }
    const [r1, r2, r3] = await Promise.all([
      fetch("/api/admin", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "set_ticket_price_bs",
          event_id: event.id,
          ticket_price_bs: parseFloat(bsPrice),
        }),
      }),
      fetch("/api/admin", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "set_ticket_price_usdt",
          event_id: event.id,
          ticket_price_usdt: parseFloat(usdtPrice),
        }),
      }),
      fetch("/api/admin", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: "set_bcv_rate",
          event_id: event.id,
          bcv_rate: parseFloat(bcvRate) || 0,
        }),
      }),
    ]);
    if (r1.ok && r2.ok && r3.ok) {
      // Update state directly from the values just saved — no re-fetch needed.
      // This avoids Supabase read-replica lag and race conditions with the
      // priceInitialized ref resetting prices before load() returns.
      const savedBs = parseFloat(bsPrice);
      const savedUsdt = parseFloat(usdtPrice);
      const savedBcv = parseFloat(bcvRate) || 0;
      setBsPrice(savedBs.toString());
      setUsdtPrice(savedUsdt.toString());
      setBcvRate(savedBcv.toString());
      setEvent((ev) =>
        ev
          ? {
              ...ev,
              ticket_price_bs: savedBs,
              ticket_price_usdt: savedUsdt,
              bcv_rate: savedBcv,
            }
          : ev,
      );
      showToast("Precios guardados ✓");
      // Fire-and-forget load for queue/other data.
      // priceInitialized stays true so load() won't overwrite our prices.
      load();
    } else {
      showToast("Error al guardar precios", "err");
    }
  };

  const approveTicket = async (ticket_id: string) => {
    const res = await fetch("/api/tickets/approve", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ ticket_id }),
    });
    if (res.ok) {
      showToast("Entrada aprobada — email enviado ✓");
      loadTickets();
    } else showToast("Error al aprobar", "err");
  };

  const rejectTicket = async (ticket_id: string, reason: string) => {
    const res = await fetch("/api/tickets/reject", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ ticket_id, reason }),
    });
    if (res.ok) {
      showToast("Entrada rechazada");
      setRejectModal(null);
      setRejectReason("");
      loadTickets();
    } else showToast("Error al rechazar", "err");
  };

  const closeNight = async () => {
    if (!event?.id) return;
    if (
      !confirm(
        "¿Cerrar la noche actual? Esto guardará al ganador y creará un nuevo evento en blanco.",
      )
    )
      return;
    setClosing(true);
    const res = await fetch("/api/admin/close-night", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ event_id: event.id }),
    });
    const data = await res.json();
    setClosing(false);
    if (res.ok) {
      showToast("¡Noche cerrada! Nuevo evento creado ✓");
      dateInitialized.current = false;
      priceInitialized.current = false;
      await load();
      await loadHistorical();
    } else showToast(`Error: ${data.error}`, "err");
  };

  if (checking)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const singing = queue.find((e) => e.status === "singing") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting");

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "entradas", label: "Entradas", icon: Ticket },
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
            onClick={logout}
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
          { label: "Entradas", path: "/tickets" },
          { label: "Scanner", path: "/scanner" },
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
                  <span className="text-[11px] text-r-muted font-mono truncate max-w-[140px]">
                    {url}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      showToast(`${label} copiado ✓`);
                    }}
                    className="ml-1.5 text-r-muted hover:text-r-text transition-colors"
                  >
                    <Copy size={11} />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-r-muted hover:text-r-text transition-colors"
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

      <DJControls singing={singing} waiting={waiting} djAction={djAction} />

      {/* Tabs */}
      <nav className="px-8 py-3 flex gap-2 border-b border-r-border flex-wrap">
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
            {id === "entradas" &&
              tickets.filter((t) => t.status === "pending").length > 0 && (
                <span className="ml-1 bg-r-red text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {tickets.filter((t) => t.status === "pending").length}
                </span>
              )}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        {tab === "dashboard" && (
          <DashboardTab
            users={users}
            queue={queue}
            ratings={ratings}
            historical={historical}
            histWinners={histWinners}
          />
        )}
        {tab === "usuarios" && (
          <UsuariosTab users={users} queue={queue} djAction={djAction} />
        )}
        {tab === "entradas" && (
          <EntradasTab
            tickets={tickets}
            ticketTab={ticketTab}
            setTicketTab={setTicketTab}
            approveTicket={approveTicket}
            setRejectModal={setRejectModal}
            loadTickets={loadTickets}
          />
        )}
        {tab === "config" && event && (
          <ConfigTab
            event={event}
            setEvent={setEvent}
            eventDateTime={eventDateTime}
            setEventDateTime={setEventDateTime}
            bsPrice={bsPrice}
            setBsPrice={setBsPrice}
            usdtPrice={usdtPrice}
            setUsdtPrice={setUsdtPrice}
            bcvRate={bcvRate}
            setBcvRate={setBcvRate}
            bcvLoading={bcvLoading}
            closing={closing}
            queue={queue}
            ratings={ratings}
            saveCooldown={saveCooldown}
            saveEventTime={saveEventTime}
            fetchBcv={fetchBcv}
            closeNight={closeNight}
            savePrecios={savePrecios}
          />
        )}
      </main>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="card w-full max-w-sm space-y-4">
            <h3 className="font-semibold">
              Rechazar entrada de {rejectModal.name}
            </h3>
            <div>
              <label className="label">Motivo (opcional)</label>
              <input
                type="text"
                className="input"
                placeholder="Pago no verificado"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  rejectTicket(rejectModal.id, rejectReason)
                }
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => rejectTicket(rejectModal.id, rejectReason)}
                className="flex-1 text-sm bg-r-red/15 border border-r-red/30 text-r-red px-4 py-2 rounded-lg hover:bg-r-red/25 transition-colors"
              >
                Confirmar rechazo
              </button>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 btn-ghost text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
