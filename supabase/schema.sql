-- ============================================================================
-- Puntaco Pádel — esquema de Supabase
--
-- Cómo usarlo:
--   1. Abrí tu proyecto en supabase.com → SQL Editor → "New query".
--   2. Pegá TODO este archivo y ejecutalo (botón "Run").
--   3. Andá a Authentication → Users → "Add user" y creá UN usuario
--      (el que usará quien carga resultados). Ejemplo:
--        email:    encargado@puntaco.local
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

-- ----------------------------------------------------------------------------
-- Semilla: la Fecha 1 de ambos grupos, ya cargada y verificada contra la
-- planilla oficial. Si la fila 'puntaco' ya existe, no se pisa.
-- ----------------------------------------------------------------------------
insert into public.league_state (id, data)
values (
  'puntaco',
  '{"version":3,"scoring":{"victoria":10,"derrotaTieBreak":2,"derrotaNormal":0,"fechaPerfecta":5,"apoyoVictoria":3,"apoyoDerrota":2,"bonus60":2,"penalizacion06":2},"groups":[{"id":"A","name":"Grupo A","players":[{"id":"tito","name":"Tito","role":"Drive","active":true},{"id":"josexo","name":"Josexo","role":"Drive","active":true},{"id":"lc","name":"LC","role":"Drive","active":true},{"id":"juanba","name":"Juanba","role":"Drive","active":true},{"id":"diego","name":"Diego","role":"Drive","active":true},{"id":"faria","name":"Faría","role":"Revés","active":true},{"id":"willy","name":"Willy","role":"Revés","active":true},{"id":"joshua","name":"Joshua","role":"Revés","active":true},{"id":"mauri","name":"Mauri","role":"Revés","active":true},{"id":"benja","name":"Benja","role":"Revés","active":true}],"fechas":[{"num":1,"date":"24-ago","pairs":[{"driveId":"tito","revesId":"faria"},{"driveId":"josexo","revesId":"willy"},{"driveId":"lc","revesId":"joshua"},{"driveId":"juanba","revesId":"mauri"},{"driveId":"diego","revesId":"benja"}]},{"num":2,"date":"31-ago","pairs":[{"driveId":"tito","revesId":"benja"},{"driveId":"josexo","revesId":"faria"},{"driveId":"lc","revesId":"willy"},{"driveId":"juanba","revesId":"joshua"},{"driveId":"diego","revesId":"mauri"}]},{"num":3,"date":"7-sept","pairs":[{"driveId":"tito","revesId":"mauri"},{"driveId":"josexo","revesId":"benja"},{"driveId":"lc","revesId":"faria"},{"driveId":"juanba","revesId":"willy"},{"driveId":"diego","revesId":"joshua"}]},{"num":4,"date":"14-sept","pairs":[{"driveId":"tito","revesId":"joshua"},{"driveId":"josexo","revesId":"mauri"},{"driveId":"lc","revesId":"benja"},{"driveId":"juanba","revesId":"faria"},{"driveId":"diego","revesId":"willy"}]},{"num":5,"date":"21-sept","pairs":[{"driveId":"tito","revesId":"willy"},{"driveId":"josexo","revesId":"joshua"},{"driveId":"lc","revesId":"mauri"},{"driveId":"juanba","revesId":"benja"},{"driveId":"diego","revesId":"faria"}]}]},{"id":"B","name":"Grupo B","players":[{"id":"sebas","name":"Sebas","role":"Drive","active":true},{"id":"ale","name":"Ale","role":"Drive","active":true},{"id":"gusta","name":"Gusta","role":"Drive","active":true},{"id":"vinchi","name":"Vinchi","role":"Drive","active":true},{"id":"jose-f","name":"José F","role":"Drive","active":true},{"id":"josue","name":"Josué","role":"Revés","active":true},{"id":"jordan","name":"Jordan","role":"Revés","active":true},{"id":"fideo","name":"Fideo","role":"Revés","active":true},{"id":"alejo","name":"Alejo","role":"Revés","active":true},{"id":"juanki","name":"Juanki","role":"Revés","active":true}],"fechas":[{"num":1,"date":"24-ago","pairs":[{"driveId":"sebas","revesId":"josue"},{"driveId":"ale","revesId":"jordan"},{"driveId":"gusta","revesId":"fideo"},{"driveId":"vinchi","revesId":"alejo"},{"driveId":"jose-f","revesId":"juanki"}]},{"num":2,"date":"31-ago","pairs":[{"driveId":"sebas","revesId":"juanki"},{"driveId":"ale","revesId":"josue"},{"driveId":"gusta","revesId":"jordan"},{"driveId":"vinchi","revesId":"fideo"},{"driveId":"jose-f","revesId":"alejo"}]},{"num":3,"date":"7-sept","pairs":[{"driveId":"sebas","revesId":"alejo"},{"driveId":"ale","revesId":"juanki"},{"driveId":"gusta","revesId":"josue"},{"driveId":"vinchi","revesId":"jordan"},{"driveId":"jose-f","revesId":"fideo"}]},{"num":4,"date":"14-sept","pairs":[{"driveId":"sebas","revesId":"fideo"},{"driveId":"ale","revesId":"alejo"},{"driveId":"gusta","revesId":"juanki"},{"driveId":"vinchi","revesId":"josue"},{"driveId":"jose-f","revesId":"jordan"}]},{"num":5,"date":"21-sept","pairs":[{"driveId":"sebas","revesId":"jordan"},{"driveId":"ale","revesId":"fideo"},{"driveId":"gusta","revesId":"alejo"},{"driveId":"vinchi","revesId":"juanki"},{"driveId":"jose-f","revesId":"josue"}]}]}],"results":[{"groupId":"A","fechaNum":1,"pairs":[{"drive":{"playerId":"tito","guestName":null,"originalPlayerId":"tito"},"reves":{"playerId":"faria","guestName":null,"originalPlayerId":"faria"}},{"drive":{"playerId":"josexo","guestName":null,"originalPlayerId":"josexo"},"reves":{"playerId":"willy","guestName":null,"originalPlayerId":"willy"}},{"drive":{"playerId":"lc","guestName":null,"originalPlayerId":"lc"},"reves":{"playerId":"joshua","guestName":null,"originalPlayerId":"joshua"}},{"drive":{"playerId":"juanba","guestName":null,"originalPlayerId":"juanba"},"reves":{"playerId":"mauri","guestName":null,"originalPlayerId":"mauri"}},{"drive":{"playerId":"diego","guestName":null,"originalPlayerId":"diego"},"reves":{"playerId":"benja","guestName":null,"originalPlayerId":"benja"}}],"matches":[{"id":"m_0_1","p1Idx":0,"p2Idx":1,"p1Games":"6","p2Games":"3","tieBreakOverride":null},{"id":"m_0_2","p1Idx":0,"p2Idx":2,"p1Games":"6","p2Games":"3","tieBreakOverride":null},{"id":"m_0_3","p1Idx":0,"p2Idx":3,"p1Games":"6","p2Games":"1","tieBreakOverride":null},{"id":"m_0_4","p1Idx":0,"p2Idx":4,"p1Games":"6","p2Games":"3","tieBreakOverride":null},{"id":"m_1_2","p1Idx":1,"p2Idx":2,"p1Games":"6","p2Games":"7","tieBreakOverride":null},{"id":"m_1_3","p1Idx":1,"p2Idx":3,"p1Games":"2","p2Games":"6","tieBreakOverride":null},{"id":"m_1_4","p1Idx":1,"p2Idx":4,"p1Games":"3","p2Games":"6","tieBreakOverride":null},{"id":"m_2_3","p1Idx":2,"p2Idx":3,"p1Games":"7","p2Games":"5","tieBreakOverride":null},{"id":"m_2_4","p1Idx":2,"p2Idx":4,"p1Games":"6","p2Games":"7","tieBreakOverride":null},{"id":"m_3_4","p1Idx":3,"p2Idx":4,"p1Games":"1","p2Games":"6","tieBreakOverride":null}]},{"groupId":"B","fechaNum":1,"pairs":[{"drive":{"playerId":"sebas","guestName":null,"originalPlayerId":"sebas"},"reves":{"playerId":"josue","guestName":null,"originalPlayerId":"josue"}},{"drive":{"playerId":"ale","guestName":null,"originalPlayerId":"ale"},"reves":{"playerId":"jordan","guestName":null,"originalPlayerId":"jordan"}},{"drive":{"playerId":"gusta","guestName":null,"originalPlayerId":"gusta"},"reves":{"playerId":"fideo","guestName":null,"originalPlayerId":"fideo"}},{"drive":{"playerId":null,"guestName":"Rotela","originalPlayerId":"vinchi"},"reves":{"playerId":"alejo","guestName":null,"originalPlayerId":"alejo"}},{"drive":{"playerId":"jose-f","guestName":null,"originalPlayerId":"jose-f"},"reves":{"playerId":"juanki","guestName":null,"originalPlayerId":"juanki"}}],"matches":[{"id":"m_0_1","p1Idx":0,"p2Idx":1,"p1Games":"6","p2Games":"4","tieBreakOverride":null},{"id":"m_0_2","p1Idx":0,"p2Idx":2,"p1Games":"3","p2Games":"6","tieBreakOverride":null},{"id":"m_0_3","p1Idx":0,"p2Idx":3,"p1Games":"6","p2Games":"4","tieBreakOverride":null},{"id":"m_0_4","p1Idx":0,"p2Idx":4,"p1Games":"6","p2Games":"4","tieBreakOverride":null},{"id":"m_1_2","p1Idx":1,"p2Idx":2,"p1Games":"6","p2Games":"1","tieBreakOverride":null},{"id":"m_1_3","p1Idx":1,"p2Idx":3,"p1Games":"6","p2Games":"0","tieBreakOverride":null},{"id":"m_1_4","p1Idx":1,"p2Idx":4,"p1Games":"6","p2Games":"2","tieBreakOverride":null},{"id":"m_2_3","p1Idx":2,"p2Idx":3,"p1Games":"3","p2Games":"6","tieBreakOverride":null},{"id":"m_2_4","p1Idx":2,"p2Idx":4,"p1Games":"6","p2Games":"4","tieBreakOverride":null},{"id":"m_3_4","p1Idx":3,"p2Idx":4,"p1Games":"6","p2Games":"4","tieBreakOverride":null}]}],"playoffs":null}'::jsonb
)
on conflict (id) do nothing;
