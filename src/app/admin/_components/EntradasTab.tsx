import clsx from "clsx";
import { RefreshCw } from "lucide-react";

interface EntradasTabProps {
  tickets: any[];
  ticketTab: "pending" | "approved" | "used" | "rejected";
  setTicketTab: (t: "pending" | "approved" | "used" | "rejected") => void;
  approveTicket: (id: string) => void;
  setRejectModal: (m: { id: string; name: string } | null) => void;
  loadTickets: () => void;
}

export function EntradasTab({
  tickets,
  ticketTab,
  setTicketTab,
  approveTicket,
  setRejectModal,
  loadTickets,
}: EntradasTabProps) {
  const labels = {
    pending: "Pendientes",
    approved: "Aprobadas",
    used: "Usadas",
    rejected: "Rechazadas",
  };
  const colors = {
    pending: "text-r-amber",
    approved: "text-r-green",
    used: "text-r-muted",
    rejected: "text-r-red",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pending", "approved", "used", "rejected"] as const).map((s) => (
          <div
            key={s}
            onClick={() => setTicketTab(s)}
            className="card2 flex flex-col gap-1 cursor-pointer hover:border-r-red/30 transition-colors"
          >
            <span className="text-[10px] uppercase tracking-widest text-r-muted font-semibold">
              {labels[s]}
            </span>
            <p
              className={clsx("font-display text-4xl leading-none", colors[s])}
            >
              {tickets.filter((t) => t.status === s).length}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(["pending", "approved", "used", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTicketTab(s)}
            className={clsx(
              "text-xs px-3 py-1.5 rounded-lg border transition-colors",
              ticketTab === s
                ? "bg-r-red/15 border-r-red/30 text-r-red"
                : "border-r-border text-r-muted hover:text-r-text",
            )}
          >
            {labels[s]}
          </button>
        ))}
        <button
          onClick={loadTickets}
          className="ml-auto text-r-muted hover:text-r-text p-1.5"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {tickets.filter((t) => t.status === ticketTab).length === 0 && (
          <p className="text-r-muted text-sm text-center py-8">
            Sin entradas en este estado
          </p>
        )}
        {tickets
          .filter((t) => t.status === ticketTab)
          .map((t) => (
            <div key={t.id} className="card flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <span className="text-[10px] text-r-muted">{t.cedula}</span>
                  {(t.quantity || 1) > 1 && (
                    <span className="text-[10px] text-r-amber border border-r-amber/30 rounded px-1.5 py-0.5">
                      {t.quantity} personas
                    </span>
                  )}
                </div>
                <p className="text-xs text-r-muted mt-0.5">
                  {t.email} · {t.phone}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-r-muted flex-wrap">
                  <span className="capitalize">
                    {t.payment_method.replace("_", " ")}
                  </span>
                  <span>
                    {t.payment_amount} {t.payment_currency}
                  </span>
                  <span>
                    Ref:{" "}
                    <span className="font-mono text-r-text">
                      {t.payment_ref}
                    </span>
                  </span>
                </div>
                <p className="text-[10px] text-r-muted mt-1">
                  {new Date(t.created_at).toLocaleString("es-VE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {t.status === "used" && t.validated_at && (
                  <p className="text-[10px] text-r-green mt-0.5">
                    ✓ Validada a las{" "}
                    {new Date(t.validated_at).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Caracas",
                    })}
                  </p>
                )}
                {t.status === "rejected" && t.rejection_reason && (
                  <p className="text-[10px] text-r-red mt-0.5">
                    ✗ {t.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {t.status === "pending" && (
                  <>
                    <button
                      onClick={() => approveTicket(t.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-r-green/15 border border-r-green/30 text-r-green hover:bg-r-green/25 transition-colors"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: t.id, name: t.name })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-r-border text-r-muted hover:text-r-red hover:border-r-red/30 transition-colors"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {(t.status === "approved" || t.status === "used") && (
                  <a
                    href={`/entry/${t.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg border border-r-border text-r-muted hover:text-r-text transition-colors text-center"
                  >
                    Ver QR
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
