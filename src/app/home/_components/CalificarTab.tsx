import { Star } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/Avatar";
import { StarRating } from "@/components/StarRating";
import type { SongQueue, Rating } from "@/lib/types";

interface CalificarTabProps {
  ratable: SongQueue[];
  ratings: Rating[];
  userId: string;
  avgRating: (id: string) => number | null;
  myRating: (id: string) => number | null;
  handleRate: (id: string, stars: number) => void;
}

export function CalificarTab({
  ratable,
  ratings,
  userId,
  avgRating,
  myRating,
  handleRate,
}: CalificarTabProps) {
  return (
    <div className="p-4 space-y-3">
      <p className="section-title">Califica · máximo 5 recientes</p>
      {ratable.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-r-muted">
          <Star size={40} className="mb-3 opacity-20" />
          <p className="text-sm">Nadie ha cantado aún</p>
        </div>
      ) : (
        ratable.map((entry) => {
          const avg = avgRating(entry.id);
          const mine = myRating(entry.id);
          const isSelf = entry.user_id === userId;
          const votes = ratings.filter(
            (r) => r.song_queue_id === entry.id,
          ).length;
          return (
            <div
              key={entry.id}
              className={clsx(
                "card space-y-3",
                entry.status === "singing" && "border-r-red/30",
              )}
            >
              {entry.status === "singing" && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-r-red animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest text-r-red font-semibold">
                    Cantando ahora
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Avatar
                  name={entry.profiles?.name ?? ""}
                  url={entry.profiles?.avatar_url}
                  size={38}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {entry.profiles?.name}
                  </p>
                  <p className="text-xs text-r-muted truncate">
                    {entry.song_name} · {entry.artist}
                  </p>
                </div>
                {avg !== null && (
                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl text-r-star leading-none">
                      {avg.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-r-muted">
                      {votes} voto{votes !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-r-border pt-3">
                {isSelf ? (
                  <p className="text-xs text-r-muted italic">
                    No puedes calificarte a ti mismo
                  </p>
                ) : mine !== null ? (
                  <div className="flex items-center gap-2">
                    <StarRating value={mine} size={18} />
                    <span className="text-xs text-r-muted">
                      Tu calificación · No editable
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-r-muted mb-1.5">
                      Toca para calificar
                    </p>
                    <StarRating
                      value={null}
                      interactive
                      size={22}
                      onRate={(s) => handleRate(entry.id, s)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
