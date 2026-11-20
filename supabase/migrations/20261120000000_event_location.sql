-- Lugar opcional (nombre y link de mapa) para el próximo evento / countdown
alter table public.events
  add column if not exists location_name text,
  add column if not exists location_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_location_name_len'
  ) then
    alter table public.events
      add constraint events_location_name_len
      check (location_name is null or char_length(btrim(location_name)) between 1 and 120) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_location_url_valid'
  ) then
    alter table public.events
      add constraint events_location_url_valid
      check (
        location_url is null
        or (char_length(location_url) <= 500 and location_url ~ '^https?://')
      ) not valid;
  end if;
end $$;
