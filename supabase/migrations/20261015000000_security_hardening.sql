-- ════════════════════════════════════════════════════════════
-- Karaoke Rock — Endurecimiento de seguridad
-- Ejecutar en Supabase → SQL Editor (es idempotente).
--
-- Modelo:
--   · Lecturas públicas (anon/authenticated): events, song_queue, ratings,
--     profiles, event_winners  → las usan /stage, /home, /admin y Realtime.
--   · Todas las escrituras pasan por las API routes con service_role,
--     que validan sesión, permisos y datos.
--   · Única escritura directa del cliente: un usuario puede cambiar SOLO
--     el campo `name` de SU propio perfil.
--   · tickets (datos personales): sin acceso para anon/authenticated.
-- ════════════════════════════════════════════════════════════

-- 1. Activar RLS en todas las tablas
alter table public.events        enable row level security;
alter table public.song_queue    enable row level security;
alter table public.ratings       enable row level security;
alter table public.profiles      enable row level security;
alter table public.event_winners enable row level security;
alter table public.tickets       enable row level security;

-- 2. Borrar políticas previas de estas tablas (para partir limpio)
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('events','song_queue','ratings','profiles','event_winners','tickets')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. Quitar privilegios de escritura a los roles del cliente
revoke insert, update, delete, truncate on
  public.events, public.song_queue, public.ratings,
  public.profiles, public.event_winners, public.tickets
from anon, authenticated;

-- tickets: ni siquiera lectura
revoke all on public.tickets from anon, authenticated;

-- 4. Lecturas públicas
create policy "events_read"        on public.events        for select to anon, authenticated using (true);
create policy "song_queue_read"    on public.song_queue    for select to anon, authenticated using (true);
create policy "ratings_read"       on public.ratings       for select to anon, authenticated using (true);
create policy "profiles_read"      on public.profiles      for select to anon, authenticated using (true);
create policy "event_winners_read" on public.event_winners for select to anon, authenticated using (true);

-- 5. Perfil: el usuario solo puede editar SU fila y SOLO la columna name
--    (is_banned, avatar_url, id, created_at quedan bloqueados)
grant update (name) on public.profiles to authenticated;

create policy "profiles_update_own_name" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Restricciones de datos (NOT VALID: no falla con filas antiguas)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_name_len') then
    alter table public.profiles
      add constraint profiles_name_len
      check (char_length(btrim(name)) between 1 and 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ratings_stars_range') then
    alter table public.ratings
      add constraint ratings_stars_range check (stars between 1 and 5) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'song_queue_text_len') then
    alter table public.song_queue
      add constraint song_queue_text_len
      check (char_length(artist) <= 200 and char_length(song_name) <= 200) not valid;
  end if;
end $$;

-- 7. El RPC de cierre de noche solo debe ejecutarlo el servidor (service_role).
--    Sin esto, cualquiera con la anon key puede cerrar la noche vía PostgREST.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.proname = 'close_night_and_create_new'
      and p.pronamespace = 'public'::regnamespace
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
