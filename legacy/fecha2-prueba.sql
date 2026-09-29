-- ============================================================================
-- Puntaco Pádel — carga de la FECHA 2 (Grupos A y B)
--
-- Pegá todo esto en el SQL Editor de Supabase y dale Run.
-- Es idempotente: si lo corrés dos veces no duplica nada, reemplaza la Fecha 2.
--
-- Incluye los apoyos partido por partido:
--   GRUPO A · Diego faltó toda la fecha, a Mauri lo acompañaron:
--     Partido 4  → invitado externo (no suma puntos)
--     Partido 7  → Joshua (apoyo, perdió → 2 pts)
--     Partido 9  → invitado externo (no suma puntos)
--     Partido 10 → Benja (apoyo, ganó → 3 pts)
--   GRUPO B · apoyos cruzados desde el Grupo A:
--     Partido 2  → LC cubrió a Gusta (ganó → 3 pts, suman en Grupo A)
--     (Gusta no jugó ningún partido esa fecha: lo cubrieron LC, Sebas, Ale y Tito)
--     Partido 5  → Sebas cubrió a Gusta (ganó → 3 pts)
--     Partido 7  → Jordan cubrió a Josué (perdió → 2) y Willy a Alejo (ganó → 3)
--     Partido 8  → Ale cubrió a Gusta (ganó → 3 pts)
--     Partido 9  → Tito cubrió a Gusta (perdió → 2 pts, suman en Grupo A)
--     Francis (los 4 partidos de Vinchi) es invitado externo: no suma, pero
--     Vinchi sí cobra los suyos.
-- ============================================================================

update public.league_state
set data = jsonb_set(
  data,
  '{results}',
  (
    select coalesce(jsonb_agg(r), '[]'::jsonb)
    from jsonb_array_elements(data->'results') r
    where not (r->>'groupId' in ('A','B') and (r->>'fechaNum')::int = 2)
  ) || '[{"groupId":"A","fechaNum":2,"pairs":[{"drive":{"playerId":"tito","guestName":null,"originalPlayerId":"tito"},"reves":{"playerId":"benja","guestName":null,"originalPlayerId":"benja"}},{"drive":{"playerId":"josexo","guestName":null,"originalPlayerId":"josexo"},"reves":{"playerId":"faria","guestName":null,"originalPlayerId":"faria"}},{"drive":{"playerId":"lc","guestName":null,"originalPlayerId":"lc"},"reves":{"playerId":"willy","guestName":null,"originalPlayerId":"willy"}},{"drive":{"playerId":"juanba","guestName":null,"originalPlayerId":"juanba"},"reves":{"playerId":"joshua","guestName":null,"originalPlayerId":"joshua"}},{"drive":{"playerId":"diego","guestName":null,"originalPlayerId":"diego"},"reves":{"playerId":"mauri","guestName":null,"originalPlayerId":"mauri"}}],"matches":[{"id":"m_0_1","p1Idx":0,"p2Idx":1,"p1Games":"3","p2Games":"6","tieBreakOverride":null},{"id":"m_0_2","p1Idx":0,"p2Idx":2,"p1Games":"6","p2Games":"0","tieBreakOverride":null},{"id":"m_0_3","p1Idx":0,"p2Idx":3,"p1Games":"6","p2Games":"0","tieBreakOverride":null},{"id":"m_0_4","p1Idx":0,"p2Idx":4,"p1Games":"6","p2Games":"4","tieBreakOverride":null,"lineup":{"4":{"drive":{"playerId":null,"guestName":"Invitado","originalPlayerId":"diego"}}}},{"id":"m_1_2","p1Idx":1,"p2Idx":2,"p1Games":"6","p2Games":"7","tieBreakOverride":null},{"id":"m_1_3","p1Idx":1,"p2Idx":3,"p1Games":"6","p2Games":"4","tieBreakOverride":null},{"id":"m_1_4","p1Idx":1,"p2Idx":4,"p1Games":"7","p2Games":"6","tieBreakOverride":null,"lineup":{"4":{"drive":{"playerId":"joshua","guestName":null,"originalPlayerId":"diego"}}}},{"id":"m_2_3","p1Idx":2,"p2Idx":3,"p1Games":"6","p2Games":"3","tieBreakOverride":null},{"id":"m_2_4","p1Idx":2,"p2Idx":4,"p1Games":"6","p2Games":"7","tieBreakOverride":null,"lineup":{"4":{"drive":{"playerId":null,"guestName":"Invitado","originalPlayerId":"diego"}}}},{"id":"m_3_4","p1Idx":3,"p2Idx":4,"p1Games":"6","p2Games":"7","tieBreakOverride":null,"lineup":{"4":{"drive":{"playerId":"benja","guestName":null,"originalPlayerId":"diego"}}}}]},{"groupId":"B","fechaNum":2,"pairs":[{"drive":{"playerId":"sebas","guestName":null,"originalPlayerId":"sebas"},"reves":{"playerId":"juanki","guestName":null,"originalPlayerId":"juanki"}},{"drive":{"playerId":"ale","guestName":null,"originalPlayerId":"ale"},"reves":{"playerId":"josue","guestName":null,"originalPlayerId":"josue"}},{"drive":{"playerId":"gusta","guestName":null,"originalPlayerId":"gusta"},"reves":{"playerId":"jordan","guestName":null,"originalPlayerId":"jordan"}},{"drive":{"playerId":"vinchi","guestName":null,"originalPlayerId":"vinchi"},"reves":{"playerId":"fideo","guestName":null,"originalPlayerId":"fideo"}},{"drive":{"playerId":"jose-f","guestName":null,"originalPlayerId":"jose-f"},"reves":{"playerId":"alejo","guestName":null,"originalPlayerId":"alejo"}}],"matches":[{"id":"m_0_1","p1Idx":0,"p2Idx":1,"p1Games":"4","p2Games":"6","tieBreakOverride":null},{"id":"m_0_2","p1Idx":0,"p2Idx":2,"p1Games":"2","p2Games":"6","tieBreakOverride":null,"lineup":{"2":{"drive":{"playerId":"lc","guestName":null,"originalPlayerId":"gusta"}}}},{"id":"m_0_3","p1Idx":0,"p2Idx":3,"p1Games":"6","p2Games":"4","tieBreakOverride":null,"lineup":{"3":{"reves":{"playerId":null,"guestName":"Francis","originalPlayerId":"fideo"}}}},{"id":"m_0_4","p1Idx":0,"p2Idx":4,"p1Games":"6","p2Games":"3","tieBreakOverride":null},{"id":"m_1_2","p1Idx":1,"p2Idx":2,"p1Games":"3","p2Games":"6","tieBreakOverride":null,"lineup":{"2":{"drive":{"playerId":"sebas","guestName":null,"originalPlayerId":"gusta"}}}},{"id":"m_1_3","p1Idx":1,"p2Idx":3,"p1Games":"6","p2Games":"3","tieBreakOverride":null,"lineup":{"3":{"reves":{"playerId":null,"guestName":"Francis","originalPlayerId":"fideo"}}}},{"id":"m_1_4","p1Idx":1,"p2Idx":4,"p1Games":"3","p2Games":"6","tieBreakOverride":null,"lineup":{"1":{"reves":{"playerId":"jordan","guestName":null,"originalPlayerId":"josue"}},"4":{"reves":{"playerId":"willy","guestName":null,"originalPlayerId":"alejo"}}}},{"id":"m_2_3","p1Idx":2,"p2Idx":3,"p1Games":"7","p2Games":"5","tieBreakOverride":null,"lineup":{"2":{"drive":{"playerId":"ale","guestName":null,"originalPlayerId":"gusta"}},"3":{"reves":{"playerId":null,"guestName":"Francis","originalPlayerId":"fideo"}}}},{"id":"m_2_4","p1Idx":2,"p2Idx":4,"p1Games":"4","p2Games":"6","tieBreakOverride":null,"lineup":{"2":{"drive":{"playerId":"tito","guestName":null,"originalPlayerId":"gusta"}}}},{"id":"m_3_4","p1Idx":3,"p2Idx":4,"p1Games":"6","p2Games":"3","tieBreakOverride":null,"lineup":{"3":{"reves":{"playerId":null,"guestName":"Francis","originalPlayerId":"fideo"}}}}]}]'::jsonb
)
where id = 'puntaco';

-- Comprobación: deberías ver 4 filas (A1, A2, B1, B2)
select r->>'groupId' as grupo,
       r->>'fechaNum' as fecha,
       jsonb_array_length(r->'matches') as partidos
from public.league_state, jsonb_array_elements(data->'results') r
where id = 'puntaco'
order by 1, 2;
