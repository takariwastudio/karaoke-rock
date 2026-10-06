"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Star, List, LogOut, Trophy } from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { CountdownView } from "@/components/CountdownView";
import { ListaTab } from "./_components/ListaTab";
import { PedirTab } from "./_components/PedirTab";
import { CalificarTab } from "./_components/CalificarTab";
import { RankingTab } from "./_components/RankingTab";
import type { Profile, SongQueue, Rating } from "@/lib/types";

type Tab = "lista" | "pedir" | "calificar" | "ranking";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("lista");
  const [user, setUser] = useState<Profile | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [queue, setQueue] = useState<SongQueue[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  const loadData = useCallback(
    async (eid: string) => {
      const [qRes, rRes] = await Promise.all([
        supabase
          .from("song_queue")
          .select("*, profiles!user_id(name, avatar_url)")
          .eq("event_id", eid)
          .in("status", ["waiting", "singing", "done"])
          .order("requested_at", { ascending: true }),
        supabase.from("ratings").select("*"),
      ]);
      if (qRes.data) setQueue(qRes.data);
      if (rRes.data) setRatings(rRes.data);
    },
    [supabase],
  );

  const reloadEvent = useCallback(async () => {
    const { data: event } = await supabase
      .from("events")
      .select("id, cooldown_minutes, starts_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!event) return;
    setEventId(event.id);
    setCooldown(event.cooldown_minutes);
    setStartsAt(event.starts_at ?? null);
    setShowCountdown(
      !!event.starts_at && new Date(event.starts_at).getTime() > Date.now(),
    );
    setQueue([]);
    setRatings([]);
    await loadData(event.id);
  }, [supabase, loadData]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/");
        return;
      }

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (!profile) {
        await fetch("/api/auth/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: authUser.id,
            name:
              authUser.user_metadata?.full_name ||
              authUser.email?.split("@")[0] ||
              "Usuario",
            avatar_url: authUser.user_metadata?.avatar_url || null,
          }),
        });
        const { data: retried } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        profile = retried;
      }
      if (!profile || profile.is_banned) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }
      setUser(profile);

      const { data: event } = await supabase
        .from("events")
        .select("id, cooldown_minutes, starts_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (event) {
        setEventId(event.id);
        setCooldown(event.cooldown_minutes);
        setStartsAt(event.starts_at ?? null);
        setShowCountdown(
          !!event.starts_at && new Date(event.starts_at).getTime() > Date.now(),
        );
        await loadData(event.id);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`home-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "song_queue",
          filter: `event_id=eq.${eventId}`,
        },
        () => loadData(eventId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => loadData(eventId),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload: any) => {
          if (payload.new?.is_active === false) {
            reloadEvent();
            return;
          }
          const sa = payload.new?.starts_at ?? null;
          setStartsAt(sa);
          setShowCountdown(!!sa && new Date(sa).getTime() > Date.now());
          setCooldown(payload.new?.cooldown_minutes ?? 30);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        () => reloadEvent(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, loadData, reloadEvent, supabase]);

  if (loading || !user)
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-r-red border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (showCountdown && startsAt) {
    return (
      <CountdownView
        startsAt={startsAt}
        userName={user.name}
        onExpire={() => setShowCountdown(false)}
      />
    );
  }

  // Derived state
  const singing = queue.find((e) => e.status === "singing") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting");
  const ratable = [
    ...queue.filter((e) => e.status === "singing"),
    ...queue
      .filter((e) => e.status === "done")
      .sort(
        (a, b) =>
          new Date(b.finished_at!).getTime() -
          new Date(a.finished_at!).getTime(),
      )
      .slice(0, 5),
  ];

  const avgRating = (id: string) => {
    const rs = ratings.filter((r) => r.song_queue_id === id);
    return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
  };
  const myRating = (id: string) =>
    ratings.find((r) => r.song_queue_id === id && r.rater_id === user.id)
      ?.stars ?? null;

  const handleRate = async (song_queue_id: string, stars: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_queue_id, rater_id: user.id, stars }),
    });
  };

  const lastRequest = queue
    .filter((e) => e.user_id === user.id)
    .sort(
      (a, b) =>
        new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
    )[0];
  const cooldownRem = lastRequest
    ? Math.max(
        0,
        Math.ceil(
          (cooldown * 60_000 -
            (Date.now() - new Date(lastRequest.requested_at).getTime())) /
            60_000,
        ),
      )
    : 0;

  const tabs = [
    { id: "lista", label: "Lista", icon: List },
    { id: "pedir", label: "Pedir", icon: Mic },
    { id: "calificar", label: "Calificar", icon: Star },
    { id: "ranking", label: "Ranking", icon: Trophy },
  ] as { id: Tab; label: string; icon: typeof Mic }[];

  return (
    <div className="min-h-screen bg-r-bg flex flex-col w-full max-w-md mx-auto">
      <header className="bg-r-surf border-b border-r-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Image
          src="/HOR_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="h-8 w-auto"
          priority
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/profile")}
            className="hover:opacity-75 transition-opacity"
          >
            <Avatar name={user.name} url={user.avatar_url} size={30} />
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="text-r-muted hover:text-r-text transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "lista" && (
          <ListaTab singing={singing} waiting={waiting} user={user} />
        )}
        {tab === "pedir" && (
          <PedirTab
            userId={user.id}
            eventId={eventId}
            cooldownRem={cooldownRem}
            onSuccess={() => setTab("lista")}
            waitingEntry={waiting.find((e) => e.user_id === user.id) ?? null}
          />
        )}
        {tab === "calificar" && (
          <CalificarTab
            ratable={ratable}
            ratings={ratings}
            userId={user.id}
            avgRating={avgRating}
            myRating={myRating}
            handleRate={handleRate}
          />
        )}
        {tab === "ranking" && (
          <RankingTab queue={queue} ratings={ratings} avgRating={avgRating} />
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-r-surf border-t border-r-border flex z-20">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              tab === id ? "text-r-red" : "text-r-muted hover:text-r-text",
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
