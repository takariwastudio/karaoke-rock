"use client";
import { useState, useRef } from "react";
import { Mic, Clock, Search, X, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import type { SongQueue, SpotifyTrack } from "@/lib/types";

interface PedirTabProps {
  userId: string;
  eventId: string | null;
  cooldownRem: number;
  onSuccess: () => void;
  waitingEntry: SongQueue | null;
}

export function PedirTab({
  userId,
  eventId,
  cooldownRem,
  onSuccess,
  waitingEntry,
}: PedirTabProps) {
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ songName: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef<NodeJS.Timeout>();

  const isChanging = changing && !!waitingEntry;

  const search = (q: string) => {
    setQuery(q);
    setSelected(null);
    clearTimeout(debounce.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.tracks ?? []);
      setSearching(false);
    }, 350);
  };

  const pick = (track: SpotifyTrack) => {
    setSelected(track);
    setQuery(`${track.name} — ${track.artist}`);
    setResults([]);
  };

  const reset = () => {
    setQuery("");
    setSelected(null);
    setResults([]);
    setError("");
    setChanging(false);
  };

  const submit = async () => {
    if (!selected) {
      setError("Elige una canción");
      return;
    }
    setSubmitting(true);
    if (isChanging && waitingEntry) {
      const res = await fetch(`/api/songs/${waitingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: selected.artist,
          song_name: selected.name,
          spotify_track_id: selected.id,
          album_art: selected.albumArt,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) {
        setError(data.message ?? data.error);
        return;
      }
      setSubmitted({ songName: selected.name });
    } else {
      if (!eventId) {
        setError("No hay evento activo");
        return;
      }
      if (cooldownRem > 0) {
        setError(`Espera ${cooldownRem} min más`);
        return;
      }
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: selected.artist,
          song_name: selected.name,
          spotify_track_id: selected.id,
          album_art: selected.albumArt,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) {
        setError(data.message ?? data.error);
        return;
      }
      setSubmitted({ songName: selected.name });
    }
  };

  if (submitted)
    return (
      <div className="p-6 flex flex-col items-center text-center gap-4 pt-10 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-r-green/10 border border-r-green/30 flex items-center justify-center">
          <Mic size={36} className="text-r-green" />
        </div>
        <h2 className="font-display text-4xl tracking-wide">
          {isChanging ? "¡Canción actualizada!" : "¡Estás en la lista!"}
        </h2>
        <div className="card w-full">
          <p className="text-r-muted text-sm">{submitted.songName}</p>
        </div>
        <button
          className="btn-ghost"
          onClick={() => {
            setSubmitted(null);
            reset();
          }}
        >
          {isChanging ? "Cambiar de nuevo" : "Pedir otra"}
        </button>
        <button
          className="btn-ghost flex items-center gap-2"
          onClick={onSuccess}
        >
          Ver la cola <ChevronRight size={14} />
        </button>
      </div>
    );

  return (
    <div className="p-4 space-y-4">
      {waitingEntry && !isChanging && (
        <div className="card border-r-amber/30 bg-r-amber/5">
          <p className="text-xs text-r-amber font-semibold mb-2">
            Tu canción en la lista
          </p>
          <div className="flex items-center gap-3">
            {waitingEntry.album_art && (
              <Image
                src={waitingEntry.album_art}
                alt=""
                width={40}
                height={40}
                className="rounded object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {waitingEntry.song_name}
              </p>
              <p className="text-xs text-r-muted">{waitingEntry.artist}</p>
            </div>
            <button
              onClick={() => setChanging(true)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-r-amber/30 text-r-amber hover:bg-r-amber/10 transition-colors"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {(!waitingEntry || isChanging) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl tracking-wide">
              {isChanging ? "CAMBIAR CANCIÓN" : "¡QUIERO CANTAR!"}
            </h2>
            {isChanging && (
              <button
                onClick={reset}
                className="text-r-muted hover:text-r-text transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {!isChanging && cooldownRem > 0 && (
            <div className="flex items-center gap-2 bg-r-amber/10 border border-r-amber/20 rounded-lg px-3 py-2 text-sm text-r-amber mb-4">
              <Clock size={14} />
              <span>Cooldown activo — {cooldownRem} min restantes</span>
            </div>
          )}
          <div className="relative">
            <label className="label">Buscar en Spotify</label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-r-muted"
              />
              <input
                type="text"
                className="input pl-8 pr-8"
                placeholder="Artista o canción..."
                value={query}
                onChange={(e) => search(e.target.value)}
                disabled={!isChanging && cooldownRem > 0}
              />
              {query && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-r-muted hover:text-r-text"
                  onClick={() => {
                    setQuery("");
                    setSelected(null);
                    setResults([]);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searching && (
              <p className="text-xs text-r-muted mt-2">Buscando...</p>
            )}
            {results.length > 0 && !selected && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-r-surf2 border border-r-border rounded-xl overflow-hidden shadow-xl z-20 animate-fade-in">
                {results.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => pick(track)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-r-border transition-colors text-left border-b border-r-border last:border-0"
                  >
                    {track.albumArt && (
                      <Image
                        src={track.albumArt}
                        alt={track.album}
                        width={36}
                        height={36}
                        className="rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {track.name}
                      </p>
                      <p className="text-xs text-r-muted truncate">
                        {track.artist} · {track.album}
                      </p>
                    </div>
                    <ChevronRight
                      size={12}
                      className="text-r-muted shrink-0 ml-auto"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="mt-3 bg-r-red/10 border border-r-red/20 rounded-lg px-3 py-2.5 flex items-center gap-3 animate-fade-in">
              {selected.albumArt && (
                <Image
                  src={selected.albumArt}
                  alt={selected.album}
                  width={40}
                  height={40}
                  className="rounded object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-r-muted">{selected.artist}</p>
              </div>
            </div>
          )}
          {error && <p className="text-r-red text-xs mt-2">{error}</p>}
          <button
            className="btn-primary mt-4"
            onClick={submit}
            disabled={
              !selected || (!isChanging && cooldownRem > 0) || submitting
            }
          >
            {submitting
              ? "ENVIANDO..."
              : isChanging
                ? "CONFIRMAR CAMBIO"
                : "AGREGAR A LA LISTA"}
          </button>
        </div>
      )}
    </div>
  );
}
