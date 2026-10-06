import {
  Mic,
  Music,
  XCircle,
  Users,
  Trophy,
  Flame,
  Ghost,
  UserX,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/Avatar";
import type { Profile, SongQueue, Rating } from "@/lib/types";

interface DashboardTabProps {
  users: Profile[];
  queue: SongQueue[];
  ratings: Rating[];
  historical: any[];
  histWinners: any[];
}

export function DashboardTab({
  users,
  queue,
  ratings,
  historical,
  histWinners,
}: DashboardTabProps) {
  const done = queue.filter((e) => e.status === "done");
  const waiting = queue.filter((e) => e.status === "waiting");

  const avgRating = (id: string) => {
    const rs = ratings.filter((r) => r.song_queue_id === id);
    return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
  };

  const songCount: Record<
    string,
    { name: string; artist: string; count: number }
  > = {};
  queue.forEach((e) => {
    const k = `${e.artist}|${e.song_name}`;
    if (!songCount[k])
      songCount[k] = { name: e.song_name, artist: e.artist, count: 0 };
    songCount[k].count++;
  });
  const topSong = Object.values(songCount).sort((a, b) => b.count - a.count)[0];

  const userActivity: Record<string, { prof: Profile; count: number }> = {};
  queue.forEach((e) => {
    const prof = users.find((u) => u.id === e.user_id);
    if (!prof) return;
    if (!userActivity[e.user_id]) userActivity[e.user_id] = { prof, count: 0 };
    userActivity[e.user_id].count++;
  });
  const topUser = Object.values(userActivity).sort(
    (a, b) => b.count - a.count,
  )[0];

  const ghostUsers = users.filter(
    (u) => !queue.some((e) => e.user_id === u.id),
  );
  const noshowUsers = users.filter((u) => {
    const entries = queue.filter((e) => e.user_id === u.id);
    return entries.length > 0 && entries.every((e) => e.status === "noshow");
  });

  const topRated = done
    .map((e) => ({
      entry: e,
      avg: avgRating(e.id) ?? 0,
      votes: ratings.filter((r) => r.song_queue_id === e.id).length,
    }))
    .filter((r) => r.votes > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Usuarios",
              value: users.length,
              color: "text-r-amber",
              icon: Users,
            },
            {
              label: "Pedidas",
              value: queue.length,
              color: "text-r-red",
              icon: Music,
            },
            {
              label: "Cantaron",
              value: done.length,
              color: "text-r-green",
              icon: Mic,
            },
            {
              label: "No shows",
              value: queue.filter((e) => e.status === "noshow").length,
              color: "text-r-muted",
              icon: XCircle,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card2 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Icon size={11} className={color} />
                <span className="text-[10px] uppercase tracking-widest text-r-muted font-semibold">
                  {label}
                </span>
              </div>
              <p className={clsx("font-display text-4xl leading-none", color)}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {topSong && (
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-r-red" />
              <span className="section-title mb-0">Canción más pedida</span>
            </div>
            <p className="font-display text-2xl tracking-wide">
              {topSong.name}
            </p>
            <p className="text-sm text-r-muted">
              {topSong.artist} · pedida {topSong.count} vez
              {topSong.count > 1 ? "es" : ""}
            </p>
          </div>
        )}

        {topUser && (
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-r-amber" />
              <span className="section-title mb-0">Usuario más activo</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar
                name={topUser.prof.name}
                url={topUser.prof.avatar_url}
                size={36}
              />
              <div>
                <p className="font-semibold">{topUser.prof.name}</p>
                <p className="text-sm text-r-muted">
                  {topUser.count} canción(es)
                </p>
              </div>
            </div>
          </div>
        )}

        {(ghostUsers.length > 0 || noshowUsers.length > 0) && (
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-r-amber" />
              <span className="section-title mb-0">Sin actividad</span>
            </div>
            {ghostUsers.length > 0 && (
              <div className="flex items-start gap-2">
                <Ghost size={14} className="text-r-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Registrados sin pedir ({ghostUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ghostUsers.map((u) => (
                      <span
                        key={u.id}
                        className="text-[11px] bg-r-surf2 border border-r-border rounded px-1.5 py-0.5 text-r-muted"
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {noshowUsers.length > 0 && (
              <div className="flex items-start gap-2">
                <UserX size={14} className="text-r-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Piden pero no aparecen ({noshowUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {noshowUsers.map((u) => (
                      <span
                        key={u.id}
                        className="text-[11px] bg-r-surf2 border border-r-border rounded px-1.5 py-0.5 text-r-muted"
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Top esta noche */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-r-amber" />
            <span className="section-title mb-0">Top cantantes esta noche</span>
          </div>
          {topRated.length === 0 ? (
            <p className="text-r-muted text-sm">Nadie calificado aún</p>
          ) : (
            <div className="space-y-4">
              {topRated.map(({ entry, avg, votes }, i) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "font-display text-2xl w-6 text-center shrink-0",
                      i === 0
                        ? "text-r-amber"
                        : i === 1
                          ? "text-[#aaa]"
                          : i === 2
                            ? "text-[#a05c1a]"
                            : "text-r-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Avatar
                    name={entry.profiles?.name ?? ""}
                    url={entry.profiles?.avatar_url}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.profiles?.name}
                    </p>
                    <p className="text-xs text-r-muted truncate">
                      {entry.song_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl text-r-star leading-none">
                      {avg.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-r-muted">{votes} votos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranking histórico */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-r-purple" />
            <span className="section-title mb-0">Ranking histórico</span>
          </div>
          {historical.length === 0 ? (
            <p className="text-r-muted text-sm">
              Sin datos aún — se construye tras cada noche
            </p>
          ) : (
            <div className="space-y-4">
              {historical.slice(0, 10).map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "font-display text-2xl w-6 text-center shrink-0",
                      i === 0
                        ? "text-r-amber"
                        : i === 1
                          ? "text-[#aaa]"
                          : i === 2
                            ? "text-[#a05c1a]"
                            : "text-r-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={u.name} url={u.avatar_url} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.timesWon > 0 && (
                        <span className="text-[10px] text-r-amber border border-r-amber/30 rounded px-1 py-0.5">
                          🏆 {u.timesWon}x
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-r-muted">
                      {u.totalVotes} votos totales
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl text-r-star leading-none">
                      {u.avg.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ganadores por noche */}
        {histWinners.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-r-amber" />
              <span className="section-title mb-0">Ganadores por noche</span>
            </div>
            <div className="space-y-3">
              {histWinners.slice(0, 10).map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-r-muted w-20 shrink-0">
                    {new Date(w.event_date).toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {w.user_name}
                    </p>
                    <p className="text-xs text-r-muted truncate">
                      {w.song_name}
                    </p>
                  </div>
                  <span className="text-r-star font-display text-lg shrink-0">
                    {Number(w.avg_rating).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
