"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Mic,
  Music,
  Star,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [stats, setStats] = useState({
    requested: 0,
    sang: 0,
    noshow: 0,
    avgRating: null as number | null,
  });
  const [winnerToast, setWinnerToast] = useState<{
    event_date: string;
    song: string;
    avg: number;
  } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: auth },
      } = await supabase.auth.getUser();
      if (!auth) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.id)
        .single();
      if (!profile) {
        router.replace("/");
        return;
      }
      setUser(profile);
      setName(profile.name);

      const { data: songs } = await supabase
        .from("song_queue")
        .select("id, status")
        .eq("user_id", auth.id);

      if (songs) {
        const sang = songs.filter((s) => s.status === "done").length;
        const noshow = songs.filter((s) => s.status === "noshow").length;
        let avgRating = null;
        if (songs.length > 0) {
          const { data: ratings } = await supabase
            .from("ratings")
            .select("stars")
            .in(
              "song_queue_id",
              songs.map((s) => s.id),
            );
          if (ratings?.length) {
            avgRating =
              ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length;
          }
        }
        setStats({ requested: songs.length, sang, noshow, avgRating });
      }

      // Verificar si ganó el evento más reciente
      const { data: lastWin } = await supabase
        .from("event_winners")
        .select("song_name, avg_rating, event_date, event_id")
        .eq("user_id", auth.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastWin) {
        const shownKey = `winner_toast_${lastWin.event_id}`;
        if (!localStorage.getItem(shownKey)) {
          setWinnerToast({
            event_date: lastWin.event_date,
            song: lastWin.song_name,
            avg: lastWin.avg_rating,
          });
          localStorage.setItem(shownKey, "1");
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      showToast("Error al guardar", false);
      return;
    }
    setUser({ ...user, name: name.trim() });
    setEditing(false);
    showToast("Nombre actualizado ✓");
  };

  if (!user)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-r-bg flex flex-col w-full max-w-md mx-auto">
      <header className="bg-r-surf border-b border-r-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push("/home")}
          className="text-r-muted hover:text-r-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-xl tracking-[2px]">
          MI <span className="text-r-red">PERFIL</span>
        </h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {/* Avatar + nombre */}
        <div className="card flex items-center gap-4">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name}
              width={64}
              height={64}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                background: "#e63c23",
                fontSize: 24,
              }}
              className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
            >
              {user.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  className="input text-sm py-1.5 flex-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setEditing(false);
                      setName(user.name);
                    }
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="text-r-green hover:opacity-75 transition-opacity"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setName(user.name);
                  }}
                  className="text-r-muted hover:text-r-text transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg truncate">{user.name}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-r-muted hover:text-r-text transition-colors shrink-0"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <p className="text-xs text-r-muted mt-0.5">Cuenta de Google</p>
          </div>
        </div>

        {/* Estadísticas */}
        <p className="section-title">Tus estadísticas</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Canciones pedidas",
              value: stats.requested,
              color: "text-r-amber",
              icon: Music,
            },
            {
              label: "Veces que cantaste",
              value: stats.sang,
              color: "text-r-green",
              icon: Mic,
            },
            {
              label: "No shows",
              value: stats.noshow,
              color: "text-r-red",
              icon: XCircle,
            },
            {
              label: "Calificación prom.",
              value:
                stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—",
              color: "text-r-star",
              icon: Star,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card2 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Icon size={11} className={color} />
                <span className="text-[10px] uppercase tracking-widest text-r-muted font-semibold">
                  {label}
                </span>
              </div>
              <p className={clsx("font-display text-3xl leading-none", color)}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="w-full text-sm text-r-muted hover:text-r-red border border-r-border hover:border-r-red/30 rounded-xl py-3 transition-colors mt-2"
        >
          Cerrar sesión
        </button>
      </main>

      {/* Toast guardado */}
      {toast && (
        <div
          className={clsx(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl animate-slide-up",
            toast.ok
              ? "bg-r-green/20 border border-r-green/40 text-r-green"
              : "bg-r-red/20 border border-r-red/40 text-r-red",
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Winner toast */}
      {winnerToast && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="card w-full max-w-sm text-center space-y-4 border-r-amber/40">
            <div className="text-5xl">🏆</div>
            <h2 className="font-display text-3xl tracking-wide text-r-amber">
              ¡GANASTE!
            </h2>
            <p className="text-r-muted text-sm">
              El{" "}
              {new Date(winnerToast.event_date).toLocaleDateString("es-VE", {
                day: "numeric",
                month: "long",
              })}
              , cantaste{" "}
              <span className="text-r-text font-medium">
                {winnerToast.song}
              </span>{" "}
              y fuiste el mejor valorado de la noche con{" "}
              <span className="text-r-amber font-semibold">
                {Number(winnerToast.avg).toFixed(1)} ⭐
              </span>
            </p>
            <p className="text-xs text-r-muted">
              Toma un capture y dile a{" "}
              <span className="text-r-text font-medium">Kako o KixKira</span>{" "}
              que ganaste 🤘
            </p>
            <button
              onClick={() => setWinnerToast(null)}
              className="btn-primary"
            >
              ¡GENIAL!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
