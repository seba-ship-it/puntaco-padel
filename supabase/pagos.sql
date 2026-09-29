-- ============================================================================
-- Pagos y multas (cuotas, invitados, dobles faltas): tabla PRIVADA.
--
-- A diferencia de la liga, acá la LECTURA también exige clave: el dinero de
-- cada jugador no lo ve quien solo mira la tabla. Es seguro correrlo más de
-- una vez. Pegalo en Supabase → SQL Editor → Run.
-- ============================================================================

create table if not exists public.league_finance (
  id text primary key default 'puntaco',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.league_finance enable row level security;

-- Nada para anon: sin clave no se puede ni leer.
revoke all on public.league_finance from anon;
grant select, insert, update on public.league_finance to authenticated;

drop policy if exists "Pagos: lectura logueado" on public.league_finance;
create policy "Pagos: lectura logueado"
  on public.league_finance for select
  using (auth.role() = 'authenticated');

drop policy if exists "Pagos: alta logueado" on public.league_finance;
create policy "Pagos: alta logueado"
  on public.league_finance for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Pagos: edición logueado" on public.league_finance;
create policy "Pagos: edición logueado"
  on public.league_finance for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
