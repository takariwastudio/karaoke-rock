"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

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

interface CountdownViewProps {
  startsAt: string;
  userName?: string;
  onExpire: () => void;
}

export function CountdownView({
  startsAt,
  userName,
  onExpire,
}: CountdownViewProps) {
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
        <Image
          src="/HOR_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="h-12 w-auto mx-auto"
          priority
        />
        <p className="text-r-muted text-sm">
          {userName ? (
            <>
              Hola, <span className="text-r-text font-medium">{userName}</span>.
              El evento comienza en...
            </>
          ) : (
            "El evento comienza en..."
          )}
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
