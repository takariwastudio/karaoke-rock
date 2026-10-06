import { Play, SkipForward, XCircle } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import type { SongQueue } from "@/lib/types";

interface DJControlsProps {
  singing: SongQueue | null;
  waiting: SongQueue[];
  djAction: (action: string, extra?: object) => void;
}

export function DJControls({ singing, waiting, djAction }: DJControlsProps) {
  return (
    <div className="px-8 py-5 border-b border-r-border bg-r-surf/30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-r-red to-r-amber" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full ${singing ? "bg-r-red animate-pulse" : "bg-r-border"}`}
                />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-r-red">
                  {singing ? "Ahora cantando" : "Sin cantante activo"}
                </span>
              </div>
              {singing ? (
                <div className="flex items-center gap-3">
                  {singing.album_art && (
                    <Image
                      src={singing.album_art}
                      alt=""
                      width={52}
                      height={52}
                      className="rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-display text-2xl tracking-wide">
                      {singing.song_name}
                    </p>
                    <p className="text-r-muted text-sm">{singing.artist}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Avatar
                        name={singing.profiles?.name ?? ""}
                        url={singing.profiles?.avatar_url}
                        size={22}
                      />
                      <span className="text-sm">{singing.profiles?.name}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-r-muted">
                  {waiting.length > 0
                    ? `${waiting.length} en espera`
                    : "Cola vacía"}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {!singing && waiting.length > 0 && (
                <button
                  onClick={() => djAction("start")}
                  className="flex items-center gap-1.5 bg-r-green/15 border border-r-green/30 text-r-green px-4 py-2 rounded-lg text-sm hover:bg-r-green/25 transition-colors"
                >
                  <Play size={14} /> Iniciar
                </button>
              )}
              {singing && (
                <>
                  <button
                    onClick={() => djAction("next")}
                    className="flex items-center gap-1.5 bg-r-red/15 border border-r-red/30 text-r-red px-4 py-2 rounded-lg text-sm hover:bg-r-red/25 transition-colors"
                  >
                    <SkipForward size={14} /> Siguiente
                  </button>
                  <button
                    onClick={() => djAction("noshow")}
                    className="flex items-center gap-1.5 text-r-muted border border-r-border px-4 py-2 rounded-lg text-sm hover:text-r-text transition-colors"
                  >
                    <XCircle size={14} /> No Show
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <p className="section-title">
            Próximos en la lista ({waiting.length})
          </p>
          {waiting.length === 0 ? (
            <p className="text-r-muted text-sm">Cola vacía</p>
          ) : (
            <div className="space-y-2.5 max-h-40 overflow-y-auto">
              {waiting.slice(0, 8).map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 group">
                  <span className="font-display text-lg text-r-muted w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <Avatar
                    name={e.profiles?.name ?? ""}
                    url={e.profiles?.avatar_url}
                    size={26}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.profiles?.name}
                    </p>
                    <p className="text-xs text-r-muted truncate">
                      {e.song_name} · {e.artist}
                    </p>
                  </div>
                  <button
                    onClick={() => djAction("remove", { song_id: e.id })}
                    className="opacity-0 group-hover:opacity-100 text-r-muted hover:text-r-red text-xl leading-none transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
