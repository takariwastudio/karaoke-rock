"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

export default function EntryPage() {
  const { token } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(true);
          return;
        }
        setTicket(data);
        setLoading(false);
      })
      .catch(() => setError(true));
  }, [token]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qrValue = `${origin}/entry/${token}`;

  if (loading && !error)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error || !ticket)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#888", fontSize: 14 }}>Entrada no encontrada</p>
      </div>
    );

  const isValid = ticket.status === "approved";
  const isUsed = ticket.status === "used";
  const statusBg = isValid ? "#52b788" : isUsed ? "#555" : "#f6bc3f";
  const statusTxt = isValid
    ? "✓ Entrada Válida"
    : isUsed
      ? "✗ Entrada Usada"
      : "⏳ Pendiente";
  const eventDate = ticket.event_date
    ? new Date(ticket.event_date).toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Image
            src="/HOR_B.webp"
            alt="Karaoke Rock"
            width={0}
            height={0}
            sizes="100vw"
            style={{ height: 36, width: "auto", margin: "0 auto" }}
            priority
          />
        </div>

        <div
          style={{
            background: "#242424",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid #2e2e2e",
          }}
        >
          <div style={{ background: statusBg, padding: "12px 20px" }}>
            <span
              style={{
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {statusTxt}
            </span>
          </div>

          <div style={{ padding: "20px 20px 0" }}>
            <h2
              style={{
                color: "#f5f5f5",
                fontSize: 22,
                margin: "0 0 4px",
                fontWeight: 700,
              }}
            >
              {ticket.name}
            </h2>
            {eventDate && (
              <p
                style={{
                  color: "#888",
                  fontSize: 13,
                  margin: "0 0 20px",
                  textTransform: "capitalize",
                }}
              >
                {eventDate}
              </p>
            )}
          </div>

          <div style={{ padding: "0 20px 20px", textAlign: "center" }}>
            <div
              style={{
                background: "#f5f5f5",
                borderRadius: 16,
                padding: 16,
                display: "inline-block",
              }}
            >
              <QRCodeSVG
                value={qrValue}
                size={220}
                bgColor="#f5f5f5"
                fgColor="#1a1a1a"
                level="H"
              />
            </div>
            <p
              style={{
                color: "#555",
                fontSize: 11,
                marginTop: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {isUsed
                ? "Esta entrada ya fue utilizada"
                : "Muestra este código en la entrada"}
            </p>
          </div>

          <div style={{ borderTop: "2px dashed #2e2e2e", margin: "0 20px" }} />

          <div style={{ padding: 20, fontSize: 13 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#888" }}>Cédula</span>
              <span style={{ color: "#f5f5f5" }}>{ticket.cedula}</span>
            </div>
            {isUsed && ticket.validated_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#888" }}>Validada a las</span>
                <span style={{ color: "#888" }}>
                  {new Date(ticket.validated_at).toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Caracas",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <p
          style={{
            color: "#333",
            fontSize: 11,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.8,
          }}
        >
          No compartas este QR.
          <br />
          Solo puede ser validado en la entrada del evento.
        </p>
      </div>
    </div>
  );
}
