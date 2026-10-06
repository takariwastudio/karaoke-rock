"use client";
import { useState, useEffect } from "react";
import { Trophy, Star } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/Avatar";
import type { SongQueue, Rating } from "@/lib/types";

interface RankingTabProps {
  queue: SongQueue[];
  ratings: Rating[];
  avgRating: (id: string) => number | null;
}

export function RankingTab({ queue, ratings, avgRating }: RankingTabProps) {
  const [subtab, setSubtab] = useState<"noche" | "historico">("noche");
  const [historical, setHistorical] = useState<any[]>([]);
  const [loadingH, setLoadingH] = useState(false);

  useEffect(() => {
    if (subtab !== "historico" || historical.length > 0) return;
    setLoadingH(true);
    fetch("/api/rankings")
      .then((r) => r.json())
      .then((d) => {
        setHistorical(d.historical ?? []);
        setLoadingH(false);
      });
  }, [subtab, historical.length]);

  const ranked = queue
    .filter((e) => e.status === "done")
    .map((e) => ({
      entry: e,
      avg: avgRating(e.id),
      votes: ratings.filter((r) => r.song_queue_id === e.id).length,
    }))
    .filter((r) => r.votes > 0)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
    .slice(0, 10);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {[
          { id: "noche", label: "Esta noche" },
          { id: "historico", label: "Histórico" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubtab(id as any)}
            className={clsx(
              "flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-colors",
              subtab === id
                ? "bg-r-red/15 border-r-red/30 text-r-red"
                : "border-r-border text-r-muted hover:text-r-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {subtab === "noche" && (
        <>
          <p className="section-title">Ranking de la noche</p>
          {ranked.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-r-muted">
              <Trophy size={40} className="mb-3 opacity-20" />
              <p className="text-sm text-center">
                El ranking aparece cuando alguien cante y sea calificado
              </p>
            </div>
          ) : (
            ranked.map(({ entry, avg, votes }, i) => (
              <div
                key={entry.id}
                className={clsx(
                  "card flex items-center gap-3",
                  i === 0 && "border-r-amber/40 bg-r-amber/5",
                )}
              >
                <span
                  className={clsx(
                    "font-display text-3xl w-8 text-center shrink-0",
                    i === 0
                      ? "text-r-amber"
                      : i === 1
                        ? "text-[#aaaaaa]"
                        : i === 2
                          ? "text-[#cd7f32]"
                          : "text-r-muted",
                  )}
                >
                  {i + 1}
                </span>
                <Avatar
                  name={entry.profiles?.name ?? ""}
                  url={entry.profiles?.avatar_url}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {entry.profiles?.name}
                  </p>
                  <p className="text-xs text-r-muted truncate">
                    {entry.song_name} · {entry.artist}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={
                          (avg ?? 0) >= n
                            ? "text-r-star fill-r-star"
                            : "text-r-border"
                        }
                        fill={(avg ?? 0) >= n ? "#FFD60A" : "none"}
                      />
                    ))}
                    <span className="text-[11px] text-r-muted ml-1">
                      {avg?.toFixed(1)} · {votes} voto{votes !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {i === 0 && <span className="text-lg shrink-0">🏆</span>}
                {i === 1 && <span className="text-lg shrink-0">🥈</span>}
                {i === 2 && <span className="text-lg shrink-0">🥉</span>}
              </div>
            ))
          )}
        </>
      )}

      {subtab === "historico" && (
        <>
          <p className="section-title">Mejores de todos los tiempos</p>
          {loadingH ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historical.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-r-muted">
              <Trophy size={40} className="mb-3 opacity-20" />
              <p className="text-sm text-center">
                El histórico se construye evento a evento
              </p>
            </div>
          ) : (
            historical.map((u, i) => (
              <div
                key={u.user_id}
                className={clsx(
                  "card flex items-center gap-3",
                  i === 0 && "border-r-amber/40 bg-r-amber/5",
                )}
              >
                <span
                  className={clsx(
                    "font-display text-3xl w-8 text-center shrink-0",
                    i === 0
                      ? "text-r-amber"
                      : i === 1
                        ? "text-[#aaaaaa]"
                        : i === 2
                          ? "text-[#cd7f32]"
                          : "text-r-muted",
                  )}
                >
                  {i + 1}
                </span>
                <Avatar name={u.name} url={u.avatar_url} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    {u.timesWon > 0 && (
                      <span className="text-[10px] text-r-amber border border-r-amber/30 rounded px-1.5 py-0.5">
                        🏆 {u.timesWon} noche{u.timesWon > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={
                          u.avg >= n
                            ? "text-r-star fill-r-star"
                            : "text-r-border"
                        }
                        fill={u.avg >= n ? "#FFD60A" : "none"}
                      />
                    ))}
                    <span className="text-[11px] text-r-muted ml-1">
                      {u.avg.toFixed(2)} · {u.totalVotes} voto
                      {u.totalVotes !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {i === 0 && <span className="text-lg shrink-0">👑</span>}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
