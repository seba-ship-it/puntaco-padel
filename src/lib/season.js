/**
 * Temporadas: cierre, ascensos, descensos y repechaje (Reglamento Puntako 2026).
 *
 * Una temporada son 5 fechas. Al terminar la Fecha 5, por CADA puesto
 * (Drive y Revés, que se rankean por separado):
 *   - Asciende directo el 1º del Grupo B  → pasa al Grupo A
 *   - Desciende directo el último del A   → pasa al Grupo B
 *   - Repechaje: el penúltimo del A vs. el 2º del B (se juega como partido
 *     extra en la Fecha 1 de la temporada siguiente, con la pareja completa:
 *     el Drive y el Revés de cada lado). Si gana B, se intercambian.
 *
 * Todo se calcula desde los resultados; el historial guarda una foto de cada
 * temporada cerrada (tabla, campeones, movimientos).
 */

import { buildCalendar, nextWeeklyDates } from '../data/defaults.js';
import { MATCHES_PER_FECHA, computeStandings, countPlayed } from './scoring.js';

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
      if (countPlayed(result?.matches) === MATCHES_PER_FECHA) done += 1;
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
 * las dos parejas entre grupos (a partir de la Fecha 2, porque la Fecha 1 es
 * justamente la que se juega con los grupos como estaban).
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
    groups = swapBetweenGroups(groups, rep.a.driveId, rep.b.driveId, { fromFecha: 2 });
    groups = swapBetweenGroups(groups, rep.a.revesId, rep.b.revesId, { fromFecha: 2 });
  }
  return {
    ...league,
    groups,
    repechaje: { ...rep, scoreA: String(a), scoreB: String(b), winner, done: true },
  };
}
