-- Cantidad de personas por compra (un solo QR para todo el grupo)
alter table public.tickets
  add column if not exists quantity integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_quantity_range'
  ) then
    alter table public.tickets
      add constraint tickets_quantity_range check (quantity between 1 and 100) not valid;
  end if;
end $$;
