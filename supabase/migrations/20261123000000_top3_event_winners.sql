-- Top 3 cantantes por noche en event_winners (+ relleno de noches pasadas)
-- Ejecutar en Supabase → SQL Editor (es idempotente).

alter table public.event_winners
  add column if not exists position smallint not null default 1;

do $$
declare
  c record;
  idx record;
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_winners_position_range'
  ) then
    alter table public.event_winners
      add constraint event_winners_position_range
      check (position between 1 and 3) not valid;
  end if;

  -- Si existía una restricción UNIQUE(event_id) de 1 sola columna, quitarla para permitir 3 puestos
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.event_winners'::regclass
      and contype = 'u'
      and array_length(conkey, 1) = 1
      and conkey[1] = (
        select attnum from pg_attribute
        where attrelid = 'public.event_winners'::regclass
          and attname = 'event_id'
      )
  loop
    execute format('alter table public.event_winners drop constraint %I', c.conname);
  end loop;

  -- Quitar también cualquier índice único independiente sobre solo (event_id)
  for idx in
    select i.relname as indexname
    from pg_index ix
    join pg_class i on i.oid = ix.indexrelid
    left join pg_constraint con on con.conindid = ix.indexrelid
    where ix.indrelid = 'public.event_winners'::regclass
      and ix.indisunique
      and not ix.indisprimary
      and con.oid is null
      and ix.indnkeyatts = 1
      and ix.indkey[0] = (
        select attnum from pg_attribute
        where attrelid = 'public.event_winners'::regclass
          and attname = 'event_id'
      )
  loop
    execute format('drop index if exists public.%I', idx.indexname);
  end loop;
end $$;

create unique index if not exists event_winners_event_id_position_idx
  on public.event_winners (event_id, position);

-- Rellenar automáticamente el 2do y 3er lugar de las noches ya cerradas
-- a partir de song_queue + ratings, sin tocar el 1er lugar existente.
with song_scores as (
  select
    sq.event_id,
    sq.user_id,
    coalesce(p.name, '') as user_name,
    sq.song_name,
    coalesce(sq.artist, '') as artist,
    round(avg(r.stars)::numeric, 2) as avg_rating,
    count(r.stars)::integer as vote_count,
    coalesce(
      (select ew.event_date from public.event_winners ew where ew.event_id = sq.event_id limit 1),
      e.date
    ) as event_date,
    row_number() over (
      partition by sq.event_id, sq.user_id
      order by avg(r.stars) desc, count(r.stars) desc, sq.id asc
    ) as user_song_rank
  from public.song_queue sq
  join public.events e on e.id = sq.event_id
  join public.ratings r on r.song_queue_id = sq.id
  left join public.profiles p on p.id = sq.user_id
  where e.is_active = false
    and sq.status = 'done'
  group by sq.id, sq.event_id, sq.user_id, p.name, sq.song_name, sq.artist, e.date
),
best_per_singer as (
  select *
  from song_scores
  where user_song_rank = 1
),
remaining_singers as (
  select
    b.*,
    row_number() over (
      partition by b.event_id
      order by b.avg_rating desc, b.vote_count desc, b.user_id asc
    ) as rem_rank,
    exists (
      select 1 from public.event_winners ew
      where ew.event_id = b.event_id and ew.position = 1
    ) as has_winner
  from best_per_singer b
  where not exists (
    select 1
    from public.event_winners ew
    where ew.event_id = b.event_id
      and ew.user_id = b.user_id
  )
)
insert into public.event_winners (
  event_id,
  user_id,
  user_name,
  song_name,
  artist,
  avg_rating,
  vote_count,
  event_date,
  position
)
select
  event_id,
  user_id,
  user_name,
  song_name,
  artist,
  avg_rating,
  vote_count,
  event_date,
  (case when has_winner then rem_rank + 1 else rem_rank end)::smallint as position
from remaining_singers
where (case when has_winner then rem_rank + 1 else rem_rank end) <= 3
on conflict (event_id, position) do nothing;
