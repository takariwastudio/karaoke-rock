import clsx from "clsx";
import { Settings, Calendar, Ticket, XCircle } from "lucide-react";
import type { Event, SongQueue, Rating } from "@/lib/types";

interface ConfigTabProps {
  event: Event;
  setEvent: (e: Event) => void;
  eventDateTime: string;
  setEventDateTime: (d: string) => void;
  bsPrice: string;
  setBsPrice: (p: string) => void;
  usdtPrice: string;
  setUsdtPrice: (p: string) => void;
  bcvLoading: boolean;
  closing: boolean;
  queue: SongQueue[];
  ratings: Rating[];
  saveCooldown: (m: number) => void;
  saveEventTime: (clear?: boolean) => void;
  fetchBcv: () => void;
  closeNight: () => void;
  savePrecios: () => void;
}

export function ConfigTab({
  event,
  setEvent,
  eventDateTime,
  setEventDateTime,
  bsPrice,
  setBsPrice,
  usdtPrice,
  setUsdtPrice,
  bcvLoading,
  closing,
  queue,
  ratings,
  saveCooldown,
  saveEventTime,
  fetchBcv,
  closeNight,
  savePrecios,
}: ConfigTabProps) {
  const done = queue.filter((e) => e.status === "done");
  const waiting = queue.filter((e) => e.status === "waiting");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cooldown */}
      <div className="card">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Settings size={15} className="text-r-red" /> Cooldown entre canciones
        </h3>
        <p className="text-xs text-r-muted mb-6">
          Tiempo mínimo que debe esperar un usuario para pedir otra canción
        </p>
        <div className="flex items-center gap-4 mb-5">
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={event.cooldown_minutes}
            onChange={(e) =>
              setEvent({ ...event, cooldown_minutes: Number(e.target.value) })
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

      {/* Countdown */}
      <div className="card flex flex-col">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Calendar size={15} className="text-r-amber" /> Próximo evento
        </h3>
        <p className="text-xs text-r-muted mb-6">
          Activa un countdown en el home hasta que llegue la hora.
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
          <button className="btn-ghost flex-1" onClick={() => saveEventTime()}>
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

      {/* Precio de entradas */}
      <div className="card lg:col-span-2">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Ticket size={15} className="text-r-purple" /> Precio de entradas
        </h3>
        <p className="text-xs text-r-muted mb-5">
          Configura los precios antes de abrir la venta
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tasa BCV — entrada manual + botón auto */}
          <div>
            <label className="label">Tasa BCV (Bs/USD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                className="input flex-1"
                placeholder="Ej: 62.50"
                value={event.bcv_rate || ""}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    bcv_rate: Number(e.target.value),
                  })
                }
              />
              <button
                onClick={fetchBcv}
                disabled={bcvLoading}
                className="btn-ghost text-xs shrink-0 px-3"
                title="Obtener tasa del BCV automáticamente"
              >
                {bcvLoading ? "..." : "📡 Auto"}
              </button>
            </div>
          </div>

          {/* Precio en USDT */}
          <div>
            <label className="label">Precio en USDT</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={event.ticket_price_usdt || 5}
              onChange={(e) => {
                setEvent({
                  ...event,
                  ticket_price_usdt: Number(e.target.value),
                });
                setUsdtPrice(e.target.value);
              }}
            />
          </div>

          {/* Precio en Bolívares */}
          <div className="sm:col-span-2">
            <label className="label">Precio en Bolívares</label>
            <input
              type="number"
              step="1"
              className="input"
              placeholder="Ej: 36500"
              value={event.ticket_price_bs || ""}
              onChange={(e) => {
                setEvent({
                  ...event,
                  ticket_price_bs: Number(e.target.value),
                });
                setBsPrice(e.target.value);
              }}
            />
            {event.bcv_rate > 0 && event.ticket_price_usdt > 0 && (
              <p className="text-xs text-r-muted mt-1.5 flex items-center gap-2">
                <span>
                  {event.ticket_price_usdt} USDT × {event.bcv_rate} Bs ={" "}
                  <span className="text-r-amber">
                    {(event.ticket_price_usdt * event.bcv_rate).toLocaleString(
                      "es-VE",
                    )}{" "}
                    Bs
                  </span>
                </span>
                <button
                  className="text-r-purple underline text-xs"
                  onClick={() => {
                    const calc = Math.round(
                      event.ticket_price_usdt * event.bcv_rate,
                    );
                    setEvent({ ...event, ticket_price_bs: calc });
                    setBsPrice(calc.toString());
                  }}
                >
                  usar
                </button>
              </p>
            )}
          </div>
        </div>

        <button className="btn-ghost mt-5 w-full" onClick={savePrecios}>
          Guardar precios
        </button>
      </div>

      {/* Cerrar noche */}
      <div className="card lg:col-span-2 border-r-red/20">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <XCircle size={15} className="text-r-red" /> Cerrar noche
        </h3>
        <p className="text-xs text-r-muted mb-4">
          Guarda al ganador de la noche, cierra el evento actual y crea uno
          nuevo en blanco.
        </p>
        <div className="bg-r-surf2 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-r-muted">Evento actual</span>
            <span>{event.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-r-muted">Canciones esta noche</span>
            <span>
              {done.length} cantadas · {waiting.length} en espera
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-r-muted">Votaciones</span>
            <span>{ratings.length} votos emitidos</span>
          </div>
        </div>
        <button
          onClick={closeNight}
          disabled={closing}
          className="w-full text-sm text-r-red hover:bg-r-red/10 border border-r-red/30 rounded-xl py-3 transition-colors font-medium disabled:opacity-50"
        >
          {closing ? "Cerrando..." : "🌙 Cerrar noche y crear nueva"}
        </button>
      </div>
    </div>
  );
}
