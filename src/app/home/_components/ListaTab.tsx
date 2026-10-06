import { Music } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { Avatar } from "@/components/Avatar";
import type { SongQueue, Profile } from "@/lib/types";

interface ListaTabProps {
  singing: SongQueue | null;
  waiting: SongQueue[];
  user: Profile;
}

export function ListaTab({ singing, waiting, user }: ListaTabProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-r-red to-r-amber" />
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-r-red animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-r-red">
            Ahora cantando
          </span>
        </div>
        {singing ? (
          <>
            {singing.album_art && (
              <Image
                src={singing.album_art}
                alt={singing.song_name}
                width={48}
                height={48}
                className="rounded-lg mb-2 object-cover"
              />
            )}
            <p className="font-display text-2xl tracking-wide">
              {singing.song_name}
            </p>
            <p className="text-r-muted text-sm mt-0.5">{singing.artist}</p>
            <div className="flex items-center gap-2 mt-3">
              <Avatar
                name={singing.profiles?.name ?? ""}
                url={singing.profiles?.avatar_url}
                size={28}
              />
              <span className="text-sm font-medium">
                {singing.profiles?.name}
              </span>
              {singing.user_id === user.id && (
                <span className="badge-singing ml-1">¡Eres tú!</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-r-muted text-sm py-1">
            Nadie cantando aún — ¡pide tu canción!
          </p>
        )}
      </div>

      <p className="section-title">En espera ({waiting.length})</p>
      {waiting.length === 0 ? (
        <div className="card2 text-center py-8 text-r-muted">
          <Music size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Lista vacía</p>
        </div>
      ) : (
        waiting.map((entry, i) => (
          <div
            key={entry.id}
            className={clsx(
              "card flex items-center gap-3",
              entry.user_id === user.id && "border-r-amber/40 bg-r-amber/5",
            )}
          >
            <span className="font-display text-2xl text-r-muted w-7 text-center shrink-0">
              {i + 1}
            </span>
            <Avatar
              name={entry.profiles?.name ?? ""}
              url={entry.profiles?.avatar_url}
              size={32}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.song_name}</p>
              <p className="text-xs text-r-muted truncate">
                {entry.artist} · {entry.profiles?.name}
              </p>
            </div>
            {entry.user_id === user.id && (
              <span className="badge-waiting shrink-0">Tú</span>
            )}
          </div>
        ))
      )}

      {(() => {
        const pos = waiting.findIndex((e) => e.user_id === user.id);
        if (pos === -1) return null;
        return (
          <div className="card border-r-amber/30 bg-r-amber/5">
            <p className="text-xs text-r-amber font-semibold">Tu posición</p>
            <p className="font-display text-4xl text-r-amber mt-1">
              #{pos + 1}
            </p>
            <p className="text-xs text-r-muted mt-1">
              {pos > 0
                ? `${pos} persona${pos > 1 ? "s" : ""} antes`
                : "¡Prepárate!"}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
