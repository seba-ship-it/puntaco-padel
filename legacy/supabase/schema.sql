-- ============================================================================
-- Puntako Pádel — esquema de Supabase
--
-- Cómo usarlo:
--   1. Abrí tu proyecto en supabase.com → SQL Editor → "New query".
--   2. Pegá TODO este archivo y ejecutalo (botón "Run").
--   3. Andá a Authentication → Users → "Add user" y creá UN usuario
--      (el que usará quien carga resultados). Ejemplo:
--        email:    tu-mail@ejemplo.com
--        password: (la que elijas — es la "clave única para cargar")
--      Marcá "Auto Confirm User" para que no pida verificar el mail.
--   4. Copiá tu Project URL y anon public key desde
--      Settings → API, y pasáselos a Claude para terminar de conectar la app.
--
-- Diseño: toda la liga (grupos, jugadores, calendario, resultados) se guarda
-- como UN documento JSON en una sola fila. Es la misma estructura que ya
-- usaba la app en el navegador — así el resto del código no cambia, solo
-- cambia DÓNDE se guarda. Lectura: pública. Escritura: solo con la clave.
-- ============================================================================

create table if not exists public.league_state (
  id text primary key default 'puntaco',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.league_state enable row level security;

-- Permisos de tabla (además de las políticas de abajo).
grant select on public.league_state to anon, authenticated;
grant insert, update on public.league_state to authenticated;

-- Cualquiera con el link puede VER la liga (tabla, fechas, perfiles).
drop policy if exists "Lectura pública" on public.league_state;
create policy "Lectura pública"
  on public.league_state for select
  using (true);

-- Solo alguien logueado (con la clave única) puede cargar o corregir resultados.
drop policy if exists "Escritura solo logueado" on public.league_state;
create policy "Escritura solo logueado"
  on public.league_state for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Alta solo logueado" on public.league_state;
create policy "Alta solo logueado"
  on public.league_state for insert
  with check (auth.role() = 'authenticated');

-- Refresca updated_at solo en cada cambio real.
create or replace function public.touch_league_state()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_league_state on public.league_state;
create trigger trg_touch_league_state
  before update on public.league_state
  for each row execute function public.touch_league_state();

-- Replicación en vivo: si alguien guarda desde otro dispositivo, las pantallas
-- abiertas se actualizan solas. Sin esto la suscripción no recibe nada.
do $$
begin
  alter publication supabase_realtime add table public.league_state;
exception
  when duplicate_object then null; -- ya estaba agregada
end;
$$;

-- La liga arranca vacía: la app crea la fila la primera vez que quien tiene la clave guarda algo.
-- Los pagos y multas van en otra tabla privada: correr también supabase/pagos.sql.
