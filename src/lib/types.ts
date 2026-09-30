export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_banned: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
  cooldown_minutes: number;
  starts_at: string | null;
  ticket_price_bs: number | null;
  ticket_price_usdt: number;
  bcv_rate: number;
  created_at: string;
}

export type SongStatus = "waiting" | "singing" | "done" | "noshow";

export interface SongQueue {
  id: string;
  event_id: string;
  user_id: string;
  artist: string;
  song_name: string;
  spotify_track_id: string | null;
  album_art: string | null;
  status: SongStatus;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  profiles?: { name: string; avatar_url: string | null };
}

export interface Rating {
  id: string;
  song_queue_id: string;
  rater_id: string;
  stars: number;
  rated_at: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
}
