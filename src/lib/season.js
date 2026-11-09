/**
 * Temporadas: cierre, ascensos, descensos y repechaje (Reglamento Puntako 2026).
 *
 * Una temporada son 5 fechas. Al terminar la Fecha 5, por CADA puesto
 * (Drive y Revés, que se rankean por separado):
 *   - Asciende directo el 1º del Grupo B  → pasa al Grupo A
 *   - Desciende directo el último del A   → pasa al Grupo B
 *   - Repechaje: el penúltimo del A vs. el 2º del B (se juega como partido
 *     extra en la Fecha 1 de la temporada siguiente, con la pareja completa:
 *     el Drive y el Revés de cada lado). Si gana B, se intercambian las dos
 *     parejas, y el intercambio rige DESDE ESA MISMA FECHA 1: el que asciende
 *     ya juega la Fecha 1 en su grupo nuevo.
 *
 * Todo se calcula desde los resultados; el historial guarda una foto de cada
 * temporada cerrada (tabla, campeones, movimientos).
 */

import { buildCalendar, nextWeeklyDates } from '../data/defaults.js';
import { MATCHES_PER_FECHA, computeStandings, countResolved } from './scoring.js';

export const FECHAS_PER_SEASON = 5;
const ROLES = ['Drive', 'Revés'];

/** Tabla de un grupo separada por puesto, cada una ya ordenada. */
export function standingsByRole(league, groupId) {
  const rows = computeStandings(league, groupId);
  return {
    Drive: rows.filter((r) => r.role === 'Drive'),
    Revés: rows.filter((r) => r.role === 'Revés'),
  };
}

/** ¿Están completas las 5 fechas (10 partidos cada una) de todos los grupos? */
export function seasonProgress(league) {
  let done = 0;
  let total = 0;
  league.groups.forEach((g) => {
    for (let n = 1; n <= FECHAS_PER_SEASON; n++) {
      total += 1;
      const result = league.results.find((r) => r.groupId === g.id && r.fechaNum === n);
      if (countResolved(result) === MATCHES_PER_FECHA) done += 1;
    }
  });
  return { done, total, complete: total > 0 && done === total };
}

const slim = (row) => (row ? { playerId: row.playerId, name: row.name, role: row.role } : null);

/**
 * Quién sube, quién baja y quién juega el repechaje si la temporada
 * terminara ahora. Devuelve null si falta gente para definirlo.
 */
export function planMovements(league) {
  const a = standingsByRole(league, 'A');
  const b = standingsByRole(league, 'B');
  if (ROLES.some((r) => a[r].length < 3 || b[r].length < 2)) return null;

  const pick = (list, i) => slim(list[i < 0 ? list.length + i : i]);
  return {
    champions: {
      A: { Drive: slim(a.Drive[0]), Revés: slim(a['Revés'][0]) },
      B: { Drive: slim(b.Drive[0]), Revés: slim(b['Revés'][0]) },
    },
    promoted: ROLES.map((r) => pick(b[r], 0)),
    relegated: ROLES.map((r) => pick(a[r], -1)),
    repechaje: {
      a: { drive: pick(a.Drive, -2), reves: pick(a['Revés'], -2) },
      b: { drive: pick(b.Drive, 1), reves: pick(b['Revés'], 1) },
    },
  };
}

/** Cambia de lugar dos jugadores (uno de cada grupo) sin tocar sus ids. */
function swapBetweenGroups(groups, idA, idB, { fromFecha = 1 } = {}) {
  const inA = groups.find((g) => g.players.some((p) => p.id === idA));
  const inB = groups.find((g) => g.players.some((p) => p.id === idB));
  if (!inA || !inB || inA.id === inB.id) return groups;

  const playerA = inA.players.find((p) => p.id === idA);
  const playerB = inB.players.find((p) => p.id === idB);
  const swapId = (id) => (id === idA ? idB : id === idB ? idA : id);

  return groups.map((g) => {
    if (g.id !== inA.id && g.id !== inB.id) return g;
    const incoming = g.id === inA.id ? playerB : playerA;
    const outgoingId = g.id === inA.id ? idA : idB;
    return {
      ...g,
      players: g.players.map((p) => (p.id === outgoingId ? { ...incoming } : p)),
      fechas: g.fechas.map((f) =>
        f.num < fromFecha
          ? f
          : {
              ...f,
              pairs: f.pairs.map((pr) => ({ driveId: swapId(pr.driveId), revesId: swapId(pr.revesId) })),
            },
      ),
    };
  });
}

/** Cuántos partidos perdió cada jugador por 0-6 (base de la multa de 5.000 Gs.). */
export function fines60Of(league) {
  const out = {};
  league.groups.forEach((g) => {
    computeStandings(league, g.id).forEach((r) => {
      if (r.derrotas06 > 0) out[r.playerId] = (out[r.playerId] || 0) + r.derrotas06;
    });
  });
  return out;
}

/**
 * Cierra la temporada: guarda la foto en el historial, aplica ascensos y
 * descensos directos, arma el calendario nuevo y deja el repechaje pendiente.
 */
export function closeSeason(league) {
  const movements = planMovements(league);
  if (!movements) throw new Error('Faltan jugadores en algún puesto para definir ascensos y descensos.');

  const groups0 = league.groups;
  const snapshot = JSON.parse(
    JSON.stringify({
      number: league.seasonNumber,
      closedAt: new Date().toISOString(),
      dates: groups0[0]?.fechas.map((f) => f.date) || [],
      groups: groups0.map((g) => ({ id: g.id, name: g.name, players: g.players.map((p) => ({ id: p.id, name: p.name, role: p.role })) })),
      standings: Object.fromEntries(
        groups0.map((g) => [
          g.id,
          computeStandings(league, g.id).map((r) => ({
            playerId: r.playerId, name: r.name, role: r.role, points: r.points, pj: r.pj, pg: r.pg,
            gamesWon: r.gamesWon, gamesLost: r.gamesLost, fechasJugadas: r.fechasJugadas,
          })),
        ]),
      ),
      champions: movements.champions,
      promoted: movements.promoted,
      relegated: movements.relegated,
      repechaje: movements.repechaje,
      fines60: fines60Of(league),
      results: league.results,
    }),
  );

  // Ascensos/descensos directos: por puesto, el 1º de B intercambia con el último de A.
  let groups = groups0;
  ROLES.forEach((_, i) => {
    groups = swapBetweenGroups(groups, movements.relegated[i].playerId, movements.promoted[i].playerId, { fromFecha: 1 });
  });

  const lastDate = groups0[0]?.fechas[groups0[0].fechas.length - 1]?.date;
  const dates = nextWeeklyDates(lastDate, FECHAS_PER_SEASON);
  groups = groups.map((g) => ({ ...g, fechas: buildCalendar(g.players, dates) }));

  const { a, b } = movements.repechaje;
  return {
    ...league,
    seasonNumber: league.seasonNumber + 1,
    history: [...league.history, snapshot],
    results: [],
    groups,
    repechaje: {
      fromSeason: league.seasonNumber,
      forSeason: league.seasonNumber + 1,
      a: { driveId: a.drive.playerId, revesId: a.reves.playerId },
      b: { driveId: b.drive.playerId, revesId: b.reves.playerId },
      scoreA: '',
      scoreB: '',
      winner: null,
      done: false,
    },
  };
}

/**
 * Registra el partido de repechaje. Si gana la pareja del B, intercambia
 * las dos parejas entre grupos desde la Fecha 1 (el repechaje se juega como
 * partido extra ese mismo día, así que quien asciende ya juega la Fecha 1 en
 * su grupo nuevo, y quien baja también).
 */
export function applyRepechaje(league, scoreA, scoreB) {
  const rep = league.repechaje;
  if (!rep || rep.done) return league;
  const a = Number(scoreA);
  const b = Number(scoreB);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b || a < 0 || b < 0) {
    throw new Error('Cargá un marcador válido, sin empate.');
  }
  const winner = a > b ? 'A' : 'B';

  let groups = league.groups;
  if (winner === 'B') {
    groups = swapBetweenGroups(groups, rep.a.driveId, rep.b.driveId, { fromFecha: 1 });
    groups = swapBetweenGroups(groups, rep.a.revesId, rep.b.revesId, { fromFecha: 1 });
  }
  return {
    ...league,
    groups,
    results: winner === 'B' ? realignFecha1Results(league.results, repechajeIdMap(rep)) : league.results,
    repechaje: { ...rep, scoreA: String(a), scoreB: String(b), winner, done: true, appliedFrom: 1 },
  };
}

/**
 * Cambia quién juega el repechaje mientras no se haya jugado (por ejemplo, si
 * una pareja se da de baja o no puede jugar). `pairs` trae "a", "b" o ambos,
 * cada uno como { driveId, revesId }. Cada pareja tiene que salir de su grupo:
 * la del A, del Grupo A; la del B, del Grupo B. No mueve a nadie de grupo.
 */
export function setRepechajePairs(league, pairs) {
  const rep = league.repechaje;
  if (!rep) throw new Error('No hay repechaje en esta liga.');
  if (rep.done) throw new Error('El repechaje ya se jugó: no se puede cambiar la pareja.');

  const next = { ...rep };
  for (const side of ['a', 'b']) {
    if (!pairs?.[side]) continue;
    const { driveId, revesId } = pairs[side];
    const groupId = side === 'a' ? 'A' : 'B';
    const group = league.groups.find((g) => g.id === groupId);
    const has = (id, role) => Boolean(group?.players.some((p) => p.id === id && p.role === role));
    if (!has(driveId, 'Drive') || !has(revesId, 'Revés')) {
      throw new Error(`Elegí un Drive y un Revés del Grupo ${groupId}.`);
    }
    next[side] = { driveId, revesId };
  }
  return { ...league, repechaje: next };
}

/* ------------------------------------------- corrección de ligas viejas */

/** Los ids que intercambian los dos puestos de la pareja que juega el repechaje. */
function repechajeIdMap(rep) {
  return {
    [rep.a.driveId]: rep.b.driveId,
    [rep.b.driveId]: rep.a.driveId,
    [rep.a.revesId]: rep.b.revesId,
    [rep.b.revesId]: rep.a.revesId,
  };
}

/** Corrige los puestos de las fechas ya cargadas (solo los ids del repechaje). */
function realignFecha1Results(results, map) {
  const swapSlot = (slot) =>
    slot
      ? {
          ...slot,
          playerId: map[slot.playerId] ?? slot.playerId,
          originalPlayerId: map[slot.originalPlayerId] ?? slot.originalPlayerId,
        }
      : slot;

  return (results || []).map((r) =>
    Number(r.fechaNum) !== 1
      ? r
      : {
          ...r,
          pairs: (r.pairs || []).map((p) => ({ drive: swapSlot(p.drive), reves: swapSlot(p.reves) })),
          matches: (r.matches || []).map((m) =>
            m.lineup
              ? {
                  ...m,
                  lineup: Object.fromEntries(
                    Object.entries(m.lineup).map(([k, v]) => [k, { drive: swapSlot(v.drive), reves: swapSlot(v.reves) }]),
                  ),
                }
              : m,
          ),
        },
  );
}

/**
 * ¿La liga quedó con el repechaje aplicado desde la Fecha 2 (versión anterior)?
 * Se corrige una sola vez: después queda marcada con `appliedFrom: 1`.
 */
export function needsRepechajeFecha1(league) {
  const rep = league?.repechaje;
  return Boolean(rep && rep.done && rep.winner === 'B' && rep.appliedFrom !== 1);
}

/**
 * Corrige una liga que quedó con el repechaje aplicado desde la Fecha 2: los
 * jugadores ya están en su grupo nuevo, pero las parejas de la Fecha 1 seguían
 * armadas con la alineación vieja. Se reemplaza, en cada fecha, todo id que no
 * pertenezca al grupo por el que le corresponde, y lo mismo en las fechas ya
 * cargadas. No toca marcadores, apoyos, historial ni ningún otro dato.
 */
export function applyRepechajeDesdeFecha1(league) {
  if (!needsRepechajeFecha1(league)) return league;
  const rep = league.repechaje;
  const map = repechajeIdMap(rep);

  const groups = league.groups.map((g) => {
    const ids = new Set(g.players.map((p) => p.id));
    const fix = (id) => (ids.has(id) ? id : map[id] ?? id);
    return {
      ...g,
      fechas: g.fechas.map((f) => ({
        ...f,
        pairs: f.pairs.map((p) => ({ driveId: fix(p.driveId), revesId: fix(p.revesId) })),
      })),
    };
  });

  return {
    ...league,
    groups,
    results: realignFecha1Results(league.results, map),
    repechaje: { ...rep, appliedFrom: 1 },
  };
}

/* ------------------------------------ jugadores: mover de grupo y calendario */

/** ¿El grupo ya tiene fechas cargadas? Entonces no se puede rearmar su calendario. */
const groupHasResults = (league, groupId) => league.results.some((r) => r.groupId === groupId);

/** El grupo con su calendario rearmado para `players`, en las mismas fechas. */
function rebuiltGroup(group, players) {
  const cal = buildCalendar(players, group.fechas.map((f) => f.date));
  return {
    ...group,
    players,
    fechas: group.fechas.map((f, i) => ({ ...f, pairs: cal[i].pairs })),
  };
}

/**
 * Pasa a un jugador a otro grupo y rearma el calendario de los dos, con las
 * mismas fechas. Solo se puede si ninguno de los dos tiene fechas cargadas.
 * No toca el repechaje: si una pareja queda en el grupo que no es, se corrige
 * con setRepechajePairs.
 */
export function movePlayerToGroup(league, playerId, toGroupId) {
  const from = league.groups.find((g) => g.players.some((p) => p.id === playerId));
  if (!from) throw new Error('No encuentro a ese jugador en la liga.');
  const to = league.groups.find((g) => g.id === toGroupId);
  if (!to) throw new Error('Ese grupo no existe.');
  if (to.id === from.id) return league;
  if (groupHasResults(league, from.id) || groupHasResults(league, to.id)) {
    throw new Error('Ya hay fechas cargadas en alguno de los dos grupos: no se puede mover al jugador.');
  }

  const player = from.players.find((p) => p.id === playerId);
  const groups = league.groups.map((g) => {
    if (g.id === from.id) return rebuiltGroup(g, g.players.filter((p) => p.id !== playerId));
    if (g.id === to.id) return rebuiltGroup(g, [...g.players, player]);
    return g;
  });
  return { ...league, groups };
}

/**
 * Rearma el calendario de un grupo con sus jugadores actuales (después de
 * agregar o borrar a alguien). Solo si el grupo no tiene fechas cargadas.
 */
export function rebuildGroupCalendar(league, groupId) {
  if (groupHasResults(league, groupId)) {
    throw new Error('Ya hay fechas cargadas en ese grupo: no se puede rearmar el calendario.');
  }
  return {
    ...league,
    groups: league.groups.map((g) => (g.id === groupId ? rebuiltGroup(g, g.players) : g)),
  };
}
