import clsx from "clsx";
import { Ban } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Profile, SongQueue } from "@/lib/types";

interface UsuariosTabProps {
  users: Profile[];
  queue: SongQueue[];
  djAction: (action: string, extra?: object) => void;
}

export function UsuariosTab({ users, queue, djAction }: UsuariosTabProps) {
  return (
    <div className="space-y-2">
      <p className="section-title">{users.length} usuarios registrados</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {users.map((u) => {
          const entries = queue.filter((e) => e.user_id === u.id);
          return (
            <div
              key={u.id}
              className={clsx(
                "card flex items-center gap-3",
                u.is_banned && "opacity-60 border-r-red/30",
              )}
            >
              <Avatar name={u.name} url={u.avatar_url} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{u.name}</p>
                  {u.is_banned && <span className="badge-noshow">Baneado</span>}
                </div>
                <div className="flex gap-2 mt-0.5 text-[11px] text-r-muted flex-wrap">
                  <span>{entries.length} pedidas</span>
                  {entries.filter((e) => e.status === "done").length > 0 && (
                    <span className="text-r-green">
                      · {entries.filter((e) => e.status === "done").length}{" "}
                      cantó
                    </span>
                  )}
                  {entries.filter((e) => e.status === "noshow").length > 0 && (
                    <span className="text-r-red">
                      · {entries.filter((e) => e.status === "noshow").length}{" "}
                      no-show
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  djAction(u.is_banned ? "unban" : "ban", { user_id: u.id })
                }
                className={clsx(
                  "shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                  u.is_banned
                    ? "border-r-green/30 text-r-green hover:bg-r-green/10"
                    : "border-r-border text-r-muted hover:border-r-red/40 hover:text-r-red",
                )}
              >
                <Ban size={12} /> {u.is_banned ? "Desbanear" : "Banear"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
