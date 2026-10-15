"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Lock } from "lucide-react";
import Image from "next/image";

type ScanResult = {
  valid: boolean;
  reason?: string;
  message: string;
  ticket?: { name: string; cedula: string };
  usedAt?: string;
};

export default function ScannerPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);

  // Reusar sesión admin existente (cookie HttpOnly)
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.authed && setAuthed(true))
      .catch(() => {});
  }, []);

  const startScanner = useCallback(async () => {
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      async (decoded: string) => {
        if (processingRef.current) return;
        processingRef.current = true;

        // Extract token: either a UUID directly or from a /entry/UUID URL
        const match = decoded.match(/\/entry\/([0-9a-f-]{36})/i);
        const token =
          match?.[1] ?? (decoded.match(/^[0-9a-f-]{36}$/i) ? decoded : null);

        if (!token) {
          setResult({
            valid: false,
            message: "QR no reconocido — no es una entrada de Karaoke Rock",
          });
          setTimeout(() => {
            setResult(null);
            processingRef.current = false;
          }, 3000);
          return;
        }

        try {
          const res = await fetch("/api/tickets/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, validated_by: "scanner" }),
          });
          const data = await res.json();
          if (res.status === 401) {
            setAuthed(false);
            processingRef.current = false;
            return;
          }
          setResult(data);
        } catch {
          setResult({ valid: false, message: "Error de conexión" });
        }

        setTimeout(() => {
          setResult(null);
          processingRef.current = false;
        }, 4000);
      },
      () => {}, // ignore decode errors
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    startScanner();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [authed, startScanner]);

  const login = async () => {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      setAuthError(
        res.status === 429
          ? "Demasiados intentos. Espera unos minutos."
          : "Password incorrecto",
      );
      return;
    }
    setPw("");
    setAuthed(true);
  };

  if (!authed)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <Image
              src="/HOR_B.webp"
              alt="Karaoke Rock"
              width={0}
              height={0}
              sizes="100vw"
              className="h-10 w-auto mx-auto"
              priority
            />
            <p className="text-r-muted text-xs uppercase tracking-widest mt-2">
              Control de entrada
            </p>
          </div>
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
                  setAuthError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
              {authError && (
                <p className="text-r-red text-xs mt-1">{authError}</p>
              )}
            </div>
            <button className="btn-primary" onClick={login}>
              ENTRAR
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Image
            src="/HOR_B.webp"
            alt="Karaoke Rock"
            width={0}
            height={0}
            sizes="100vw"
            style={{ height: 32, width: "auto", margin: "0 auto" }}
            priority
          />
          <p
            style={{
              color: "#444",
              fontSize: 11,
              letterSpacing: 2,
              marginTop: 6,
              textTransform: "uppercase",
            }}
          >
            Control de entrada
          </p>
        </div>

        {/* Camera + overlay */}
        <div
          style={{
            position: "relative",
            borderRadius: 20,
            overflow: "hidden",
            background: "#111",
            aspectRatio: "1/1",
          }}
        >
          <div id="qr-reader" style={{ width: "100%", height: "100%" }} />

          {/* Guide frame when idle */}
          {!result && ready && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: 220,
                  height: 220,
                  border: "3px solid rgba(230,60,35,0.6)",
                  borderRadius: 16,
                }}
              />
            </div>
          )}

          {/* Result overlay */}
          {result && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: result.valid
                  ? "rgba(82,183,136,0.97)"
                  : result.reason === "already_used"
                    ? "rgba(180,30,10,0.97)"
                    : "rgba(200,140,10,0.97)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 28,
                textAlign: "center",
              }}
            >
              {result.valid ? (
                <>
                  <CheckCircle size={80} color="#fff" />
                  <p
                    style={{
                      color: "#fff",
                      fontSize: 28,
                      fontWeight: 800,
                      margin: "16px 0 8px",
                      letterSpacing: 2,
                    }}
                  >
                    ¡VÁLIDA!
                  </p>
                  {result.ticket && (
                    <>
                      <p
                        style={{
                          color: "#fff",
                          fontSize: 20,
                          margin: "0 0 4px",
                          fontWeight: 600,
                        }}
                      >
                        {result.ticket.name}
                      </p>
                      <p
                        style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}
                      >
                        CI: {result.ticket.cedula}
                      </p>
                    </>
                  )}
                </>
              ) : result.reason === "already_used" ? (
                <>
                  <XCircle size={80} color="#fff" />
                  <p
                    style={{
                      color: "#fff",
                      fontSize: 24,
                      fontWeight: 800,
                      margin: "16px 0 8px",
                      letterSpacing: 1,
                    }}
                  >
                    ENTRADA YA USADA
                  </p>
                  {result.ticket && (
                    <p
                      style={{ color: "#fff", fontSize: 18, margin: "0 0 4px" }}
                    >
                      {result.ticket.name}
                    </p>
                  )}
                  {result.usedAt && (
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                      Validada a las {result.usedAt}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <AlertTriangle size={80} color="#fff" />
                  <p
                    style={{
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 800,
                      margin: "16px 0 8px",
                    }}
                  >
                    INVÁLIDA
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 15 }}>
                    {result.message}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <p
          style={{
            color: "#333",
            fontSize: 12,
            textAlign: "center",
            marginTop: 14,
            letterSpacing: 1,
          }}
        >
          {ready
            ? "📷 Apunta al código QR de la entrada"
            : "Iniciando cámara..."}
        </p>
      </div>
    </div>
  );
}
