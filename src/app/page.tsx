"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

// ── Countdown helpers ──────────────────────────────────────
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

function CountdownScreen({
  startsAt,
  onExpire,
}: {
  startsAt: string;
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
          <h1 className="font-display text-5xl tracking-[4px]">
            KARAOKE <span className="text-r-red">ROCK</span>
          </h1>
          <p className="text-r-muted text-sm mt-2">Maracay</p>
        </div>

        <p className="text-r-muted text-sm">El evento comienza en...</p>

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

// ── Login page ─────────────────────────────────────────────
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const res = await fetch("/api/admin/event").catch(() => null);
      const data = res?.ok ? await res.json() : null;
      const sa = data?.event?.starts_at ?? null;
      if (sa && new Date(sa).getTime() > Date.now()) {
        setStartsAt(sa);
        setShowCountdown(true);
      } else {
        setStartsAt(null);
        setShowCountdown(false);
      }
      setChecking(false);
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("login-event")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
        },
        (payload: any) => {
          const sa = payload.new?.starts_at ?? null;
          if (sa && new Date(sa).getTime() > Date.now()) {
            setStartsAt(sa);
            setShowCountdown(true);
          } else {
            setStartsAt(null);
            setShowCountdown(false);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  // Cargando — evita flash de login antes de saber si hay countdown
  if (checking)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // Countdown activo — no se puede hacer nada
  if (showCountdown && startsAt) {
    return (
      <CountdownScreen
        startsAt={startsAt}
        onExpire={() => setShowCountdown(false)}
      />
    );
  }

  // Login normal
  return (
    <div className="min-h-screen bg-r-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-r-red/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-r-amber/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col items-center">
        <Image
          src="/VER_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="mb-8 rounded-xl w-full h-auto"
          priority
        />

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm py-3 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>
      </div>
    </div>
  );
}
