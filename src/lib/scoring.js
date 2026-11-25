/**
 * Toda la matemática de la liga. Sin React: se puede leer, probar y corregir
 * sin abrir la interfaz.
 *
 * Regla de oro: nada derivado se guarda. El ganador, el tie-break y los puntos
 * se recalculan siempre desde el marcador, así nunca quedan datos que se
 * contradigan entre sí.
 */

import { formatDate } from '../data/defaults.js';

export const PAIRS_PER_FECHA = 5;
export const MATCHES_PER_FECHA = (PAIRS_PER_FECHA * (PAIRS_PER_FECHA - 1)) / 2; // 10

/** Los 10 cruces de una fecha: todos contra todos entre las 5 parejas. */
export function buildMatchList() {
  const list = [];
  for (let i = 0; i < PAIRS_PER_FECHA; i++) {
    for (let j = i + 1; j < PAIRS_PER_FECHA; j++) {
      list.push({ id: `m_${i}_${j}`, p1Idx: i, p2Idx: j, p1Games: '', p2Games: '', tieBreakOverride: null });
    }
  }
  return list;
}

/**
 * Resultado de un partido, derivado del marcador.
 * `tieBreakOverride` en null = automático (7-6 o 6-7).
 */
export function resolveMatch(match) {
  const raw1 = String(match?.p1Games ?? '').trim();
  const raw2 = String(match?.p2Games ?? '').trim();

  if (raw1 === '' || raw2 === '') {
    return { played: false, invalid: false, winnerIdx: null, isTieBreak: false, g1: 0, g2: 0 };
  }

  const g1 = Number(raw1);
  const g2 = Number(raw2);

  if (!Number.isFinite(g1) || !Number.isFinite(g2) || g1 < 0 || g2 < 0 || g1 === g2) {
    return { played: false, invalid: true, winnerIdx: null, isTieBreak: false, g1: 0, g2: 0 };
  }

  const auto = (g1 === 7 && g2 === 6) || (g1 === 6 && g2 === 7);
  const isTieBreak = match.tieBreakOverride === null || match.tieBreakOverride === undefined
    ? auto
    : Boolean(match.tieBreakOverride);

  return { played: true, invalid: false, winnerIdx: g1 > g2 ? 0 : 1, isTieBreak, g1, g2 };
}

export function countPlayed(matches) {
  return (matches || []).reduce((acc, m) => acc + (resolveMatch(m).played ? 1 : 0), 0);
}

/* -------------------------------------------------------------------------
   Walkover (una pareja no se presentó)
   ------------------------------------------------------------------------- */

/**
 * Parejas que no se presentaron en una fecha. Se guarda en el resultado como
 * la lista de índices de pareja: `result.walkovers = [3]`.
 *
 * Reglamento: el partido cuenta como JUGADO para las dos parejas. La que se
 * presentó suma la victoria normal (sin extras: ni 6-0 ni tie-break ni fecha
 * perfecta) y la que no se presentó suma 0 puntos (sin castigo de 0-6 y sin
 * multa). El marcador no existe: no suma games a favor ni en contra.
 */
export function walkoverSet(result) {
  return new Set(Array.isArray(result?.walkovers) ? result.walkovers : []);
}

/**
 * Estado completo de un partido de una fecha:
 *   'played'       → hay marcador cargado
 *   'walkover'     → una pareja no se presentó: gana la que estaba
 *   'walkoverBoth' → no se presentó ninguna de las dos
 *   'pending'      → falta cargar
 *   'invalid'      → marcador inválido (empate)
 */
export function resolveMatchFull(result, match) {
  const absent = walkoverSet(result);
  const absent1 = absent.has(match?.p1Idx);
  const absent2 = absent.has(match?.p2Idx);

  if (absent1 || absent2) {
    if (absent1 && absent2) {
      return { status: 'walkoverBoth', winnerIdx: null, g1: null, g2: null, isTieBreak: false, played: false, invalid: false };
    }
    return { status: 'walkover', winnerIdx: absent1 ? 1 : 0, g1: null, g2: null, isTieBreak: false, played: false, invalid: false };
  }

  const r = resolveMatch(match);
  return { ...r, status: r.played ? 'played' : r.invalid ? 'invalid' : 'pending' };
}

/** ¿Este partido ya está resuelto: marcador cargado o walkover? */
export function isResolved(result, match) {
  const { status } = resolveMatchFull(result, match);
  return status === 'played' || status === 'walkover' || status === 'walkoverBoth';
}

/** Partidos resueltos de una fecha: marcadores cargados + walkovers. */
export function countResolved(result) {
  return (result?.matches || []).reduce((acc, m) => acc + (isResolved(result, m) ? 1 : 0), 0);
}

export function countInvalid(matches) {
  return (matches || []).reduce((acc, m) => acc + (resolveMatch(m).invalid ? 1 : 0), 0);
}

/* -------------------------------------------------------------------------
   Puestos de una pareja
   ------------------------------------------------------------------------- */

/**
 * Un puesto (drive o revés) de una pareja en una fecha concreta.
 *   { playerId, guestName, originalPlayerId }
 *
 * - playerId === originalPlayerId  → titular, puntúa normal
 * - playerId distinto              → "apoyo": otro jugador del MISMO grupo que cubre
 *                                     el puesto (drive por drive, revés por revés).
 *                                     Puntúa según el reglamento de apoyo.
 * - playerId === null              → invitado externo (guestName), no puntúa nadie
 */
export function slotKind(slot) {
  if (!slot || !slot.playerId) return 'invitado';
  return slot.playerId === slot.originalPlayerId ? 'titular' : 'apoyo';
}

/**
 * Puesto "ausente": el titular faltó y todavía no se dijo quién lo cubrió. Se
 * elige partido por partido. Mientras tanto no puntúa nadie (como un invitado).
 */
export function isAbsentSlot(slot) {
  return Boolean(slot && !slot.playerId && slot.absent);
}

export function absentSlot(originalPlayerId) {
  return { playerId: null, guestName: null, originalPlayerId, absent: true };
}

export function emptySlot(originalPlayerId) {
  return { playerId: originalPlayerId, guestName: null, originalPlayerId };
}

/** Crea el borrador de una fecha a partir del calendario del grupo. */
export function buildFechaDraft(group, fechaNum) {
  const fecha = group.fechas.find((f) => f.num === fechaNum);
  if (!fecha) return null;
  return {
    pairs: fecha.pairs.map((p) => ({
      drive: emptySlot(p.driveId),
      reves: emptySlot(p.revesId),
    })),
    matches: buildMatchList(),
    walkovers: [],
  };
}

/**
 * La formación que realmente se juega en una fecha: la del resultado guardado
 * —con los apoyos e invitados que cargó el admin— o, si todavía no hay
 * resultado, la del calendario.
 *
 * La usan las pantallas que no tienen el borrador del editor a mano (la lista
 * de Fechas y el link público de la jornada), para que muestren los mismos
 * nombres que se ven al cargar los resultados. Si se leyera el calendario, un
 * invitado que reemplazó a un titular no aparecería nunca.
 */
export function fechaFormation(league, group, fechaNum) {
  const saved = (league?.results || []).find((r) => r.groupId === group.id && r.fechaNum === fechaNum);
  if (saved?.pairs?.length) return saved;
  const fecha = (group.fechas || []).find((f) => f.num === fechaNum);
  if (!fecha) return null;
  return {
    pairs: fecha.pairs.map((p) => ({ drive: emptySlot(p.driveId), reves: emptySlot(p.revesId) })),
    matches: [],
  };
}

/** Nombre de un puesto para mostrar: titular, apoyo (otro jugador del grupo) o invitado externo. */
export function slotName(slot, groups) {
  if (!slot) return '—';
  if (isAbsentSlot(slot)) return 'Ausente';
  if (!slot.playerId) return slot.guestName?.trim() || 'Invitado';
  for (const g of groups || []) {
    const p = g.players.find((x) => x.id === slot.playerId);
    if (p) return p.name;
  }
  return slot.playerId;
}

/* -------------------------------------------------------------------------
   Tabla de posiciones
   ------------------------------------------------------------------------- */

function blankRow(player) {
  return {
    playerId: player.id,
    name: player.name,
    role: player.role,
    pj: 0,
    pg: 0,
    ppNormal: 0,
    ppTieBreak: 0,
    apoyoMatches: 0,
    fechasPerfectas: 0,
    bonus: 0,
    gamesWon: 0,
    gamesLost: 0,
    points: 0,
    fechasJugadas: 0,
    // Desglose, para poder mostrar de dónde sale cada punto sin recalcularlo.
    ptsWins: 0,
    ptsTieBreaks: 0, // puntos por derrotas 7-6 y 7-5
    ptsBonus: 0,
    ptsApoyo: 0,
    ptsShutout: 0, // bonus/castigo por partidos 6-0 (positivo o negativo)
    derrotas06: 0, // partidos perdidos 0-6 (multa de 5.000 Gs.)
    walkovers: 0, // partidos perdidos por no presentarse (no suman ni restan puntos)
  };
}

/**
 * Recorre una fecha y entrega cada partido resuelto junto con los puestos
 * de ambas parejas. Lo comparten la tabla y el perfil de jugador.
 */
function eachResolvedMatch(result, callback) {
  (result.matches || []).forEach((match) => {
    const r = resolveMatchFull(result, match);
    if (r.status === 'pending' || r.status === 'invalid') return;

    // Nadie se presentó: cuenta como jugado para las dos parejas, sin puntos.
    if (r.status === 'walkoverBoth') {
      callback({
        match,
        resolved: r,
        walkover: true,
        bothAbsent: true,
        winnerPairIdx: null,
        loserPairIdx: null,
        winnerGames: null,
        loserGames: null,
      });
      return;
    }

    const walkover = r.status === 'walkover';
    const winnerPairIdx = r.winnerIdx === 0 ? match.p1Idx : match.p2Idx;
    const loserPairIdx = r.winnerIdx === 0 ? match.p2Idx : match.p1Idx;

    callback({
      match,
      resolved: r,
      walkover,
      bothAbsent: false,
      winnerPairIdx,
      loserPairIdx,
      winnerGames: walkover ? null : r.winnerIdx === 0 ? r.g1 : r.g2,
      loserGames: walkover ? null : r.winnerIdx === 0 ? r.g2 : r.g1,
    });
  });
}

/**
 * Quién ocupó realmente los dos puestos de una pareja EN ESTE PARTIDO.
 *
 * `result.pairs` es la formación por defecto de la fecha. Cada partido puede
 * pisarla en `match.lineup[pairIdx]`, porque un apoyo suele entrar para un
 * partido suelto y no para toda la jornada.
 */
export function slotsForMatch(result, pairIdx, match) {
  const base = result.pairs?.[pairIdx];
  if (!base) return [];
  const override = match?.lineup?.[pairIdx];
  if (!override) return [base.drive, base.reves];
  return [override.drive || base.drive, override.reves || base.reves];
}


/**
 * Puntos de UN jugador en UN partido, según el Reglamento Puntako 2026.
 *
 *   kind        'titular' | 'apoyo'
 *   isWin       si su pareja ganó
 *   resolved    resultado de resolveMatch (usa isTieBreak)
 *   guestPartner  su compañero fue un invitado externo: no aplican los extras
 *                 (6-0, derrotas 7-6 / 7-5, castigo 0-6). Sí el puntaje base.
 *
 * Devuelve { points, part } donde `part` dice en qué renglón del desglose cae.
 */
export function matchPoints(scoring, { kind, isWin, resolved, winnerGames, loserGames, guestPartner }) {
  const shutout = winnerGames === 6 && loserGames === 0;
  const extras = !guestPartner;

  if (kind === 'apoyo') {
    // Los extras se suman al puntaje base del apoyo.
    if (isWin) {
      return { points: scoring.apoyoVictoria + (extras && shutout ? scoring.apoyoVictoria60 : 0), part: 'apoyo' };
    }
    let points = scoring.apoyoDerrota;
    if (extras && shutout) points += scoring.apoyoDerrota06;
    else if (extras && resolved.isTieBreak) points += scoring.apoyoDerrotaTieBreak;
    return { points, part: 'apoyo' };
  }

  if (isWin) {
    return { points: scoring.victoria + (extras && shutout ? scoring.bonus60 : 0), part: 'victoria', shutoutExtra: extras && shutout ? scoring.bonus60 : 0 };
  }
  if (extras && shutout) return { points: -scoring.penalizacion06, part: 'shutout' };
  if (extras && resolved.isTieBreak) return { points: scoring.derrotaTieBreak, part: 'tiebreak' };
  if (extras && winnerGames === 7 && loserGames === 5) return { points: scoring.derrota75, part: 'tiebreak' };
  return { points: scoring.derrotaNormal, part: 'normal' };
}

/** ¿El compañero de este puesto (en este partido) es un invitado externo? */
function partnerIsGuest(slots, myPos) {
  return slotKind(slots[myPos === 0 ? 1 : 0]) === 'invitado';
}

export function computeStandings(league, groupId) {
  const group = league.groups.find((g) => g.id === groupId);
  if (!group) return [];

  const scoring = league.scoring;
  const rows = new Map();
  group.players.forEach((p) => rows.set(p.id, blankRow(p)));

  // Sin filtrar por grupo: un "apoyo" puede venir del otro grupo, y sus puntos
  // deben sumar acá si esa persona es de ESTE grupo. `rows.get(...)` solo
  // encuentra filas de este grupo, así que un jugador ajeno simplemente no
  // suma nada (el `if (!row...) return` de abajo lo filtra solo).
  league.results.forEach((result) => {
      const wins = Array(PAIRS_PER_FECHA).fill(0);
      const played = Array(PAIRS_PER_FECHA).fill(0);
      const touched = new Set();

      eachResolvedMatch(result, ({ match, resolved, walkover, bothAbsent, winnerPairIdx, loserPairIdx, winnerGames, loserGames }) => {
        // Walkover sin nadie en cancha: partido jugado para las dos parejas, 0 puntos.
        if (bothAbsent) {
          [match.p1Idx, match.p2Idx].forEach((pairIdx) => {
            played[pairIdx] += 1;
            slotsForMatch(result, pairIdx, match).forEach((slot) => {
              const row = rows.get(slot?.playerId);
              if (!row || slotKind(slot) === 'invitado') return;
              row.pj += 1;
              row.ppNormal += 1;
              row.walkovers += 1;
              touched.add(slot.playerId);
            });
          });
          return;
        }

        played[winnerPairIdx] += 1;
        played[loserPairIdx] += 1;
        wins[winnerPairIdx] += 1;

        const apply = (pairIdx, isWin) => {
          const slots = slotsForMatch(result, pairIdx, match);
          slots.forEach((slot, pos) => {
            const kind = slotKind(slot);
            const row = rows.get(slot?.playerId);
            if (!row || kind === 'invitado') return;

            // Walkover: cuenta como partido jugado. La pareja que se presentó
            // suma la victoria normal (sin extras); la que no vino, 0 puntos.
            if (walkover) {
              row.pj += 1;
              if (isWin) {
                row.pg += 1;
                row.ptsWins += scoring.victoria;
                row.points += scoring.victoria;
              } else {
                row.ppNormal += 1;
                row.walkovers += 1;
              }
              touched.add(slot.playerId);
              return;
            }

            const guestPartner = partnerIsGuest(slots, pos);
            const { points, part, shutoutExtra } = matchPoints(scoring, {
              kind, isWin, resolved, winnerGames, loserGames, guestPartner,
            });
            row.pj += 1;
            row.gamesWon += isWin ? winnerGames : loserGames;
            row.gamesLost += isWin ? loserGames : winnerGames;
            if (isWin) row.pg += 1;
            else if (resolved.isTieBreak) row.ppTieBreak += 1;
            else row.ppNormal += 1;
            if (kind === 'apoyo') row.apoyoMatches += 1;
            if (part === 'apoyo') row.ptsApoyo += points;
            else if (part === 'victoria') {
              row.ptsWins += scoring.victoria;
              row.ptsShutout += shutoutExtra;
            } else if (part === 'tiebreak') row.ptsTieBreaks += points;
            else if (part === 'shutout') row.ptsShutout += points;
            if (!isWin && winnerGames === 6 && loserGames === 0) row.derrotas06 += 1;
            row.points += points;
            touched.add(slot.playerId);
          });
        };
        apply(winnerPairIdx, true);
        apply(loserPairIdx, false);
      });

      // Fecha perfecta: la pareja ganó sus 4 partidos.
      // Solo lo cobra quien jugó de titular en LOS CUATRO: si el puesto lo
      // ocuparon distintas personas, nadie hizo la fecha completa. Los
      // walkovers no cuentan: sin rival en cancha no hay fecha perfecta.
      for (let i = 0; i < PAIRS_PER_FECHA; i++) {
        if (played[i] < PAIRS_PER_FECHA - 1 || wins[i] !== PAIRS_PER_FECHA - 1) continue;

        const matchesOfPair = (result.matches || []).filter(
          (m) => (m.p1Idx === i || m.p2Idx === i) && resolveMatchFull(result, m).status === 'played',
        );
        if (matchesOfPair.length < PAIRS_PER_FECHA - 1) continue;

        [0, 1].forEach((slotPos) => {
          const occupants = matchesOfPair.map((m) => slotsForMatch(result, i, m)[slotPos]);
          const first = occupants[0];
          const siempreElMismoTitular =
            occupants.length === PAIRS_PER_FECHA - 1 &&
            occupants.every((s) => slotKind(s) === 'titular' && s?.playerId === first?.playerId);
          if (!siempreElMismoTitular) return;
          // Con un invitado de compañero en algún partido, los extras no aplican.
          const otherPos = slotPos === 0 ? 1 : 0;
          const conInvitado = matchesOfPair.some(
            (m) => slotKind(slotsForMatch(result, i, m)[otherPos]) === 'invitado',
          );
          if (conInvitado) return;

          const row = rows.get(first.playerId);
          if (!row) return;
          row.fechasPerfectas += 1;
          row.bonus += scoring.fechaPerfecta;
          row.ptsBonus += scoring.fechaPerfecta;
          row.points += scoring.fechaPerfecta;
        });
      }

      touched.forEach((playerId) => {
        const row = rows.get(playerId);
        if (row) row.fechasJugadas += 1;
      });
    });

  return sortStandings(Array.from(rows.values()));
}

/** Desempates: puntos → partidos ganados → diferencia de games → games ganados. */
export function sortStandings(rows) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.pg !== a.pg) return b.pg - a.pg;
    const difA = a.gamesWon - a.gamesLost;
    const difB = b.gamesWon - b.gamesLost;
    if (difB !== difA) return difB - difA;
    return b.gamesWon - a.gamesWon;
  });
}

/* -------------------------------------------------------------------------
   Perfil de un jugador
   ------------------------------------------------------------------------- */

/**
 * Historial completo de un jugador: cada partido que jugó, con quién,
 * contra quién y cuántos puntos sumó.
 */
export function buildPlayerProfile(league, groupId, playerId) {
  const group = league.groups.find((g) => g.id === groupId);
  const player = group?.players.find((p) => p.id === playerId);
  if (!player) return null;

  const scoring = league.scoring;
  const allPlayers = league.groups.flatMap((g) => g.players);
  const nameOf = (slot) => {
    if (!slot) return '—';
    if (isAbsentSlot(slot)) return 'Ausente';
    if (!slot.playerId) return slot.guestName?.trim() || 'Invitado';
    return allPlayers.find((p) => p.id === slot.playerId)?.name || slot.playerId;
  };
  const fechaDateOf = (result) =>
    formatDate(league.groups.find((g) => g.id === result.groupId)?.fechas.find((f) => f.num === result.fechaNum)?.date || '');

  const matches = [];
  const partnerTally = new Map();

  // Sin filtrar por grupo: si este jugador fue "apoyo" en una fecha del otro
  // grupo, también aparece acá (el `myIdx === -1` de abajo descarta el resto).
  [...league.results]
    .sort((a, b) => a.fechaNum - b.fechaNum)
    .forEach((result) => {
      eachResolvedMatch(result, ({ match, resolved, walkover, bothAbsent, winnerPairIdx, loserPairIdx, winnerGames, loserGames }) => {
        const sides = bothAbsent ? [match.p1Idx, match.p2Idx] : [winnerPairIdx, loserPairIdx];
        sides.forEach((pairIdx, side) => {
          const isWin = !bothAbsent && side === 0;
          const slots = slotsForMatch(result, pairIdx, match);
          const myIdx = slots.findIndex((s) => s?.playerId === playerId);
          if (myIdx === -1) return;

          const me = slots[myIdx];
          const kind = slotKind(me);
          const partner = slots[myIdx === 0 ? 1 : 0];
          const rivalSlots = slotsForMatch(
            result,
            bothAbsent ? (pairIdx === match.p1Idx ? match.p2Idx : match.p1Idx) : isWin ? loserPairIdx : winnerPairIdx,
            match,
          );

          const guestPartner = slotKind(partner) === 'invitado';
          const { points } = walkover
            ? { points: isWin ? scoring.victoria : 0 }
            : matchPoints(scoring, { kind, isWin, resolved, winnerGames, loserGames, guestPartner });
          const isShutout = !walkover && winnerGames === 6 && loserGames === 0;

          const partnerName = nameOf(partner);
          const tally = partnerTally.get(partnerName) || { name: partnerName, played: 0, won: 0 };
          tally.played += 1;
          if (isWin) tally.won += 1;
          partnerTally.set(partnerName, tally);

          matches.push({
            fechaNum: result.fechaNum,
            fechaDate: fechaDateOf(result),
            crossGroup: result.groupId !== groupId,
            fechaGroupName: league.groups.find((g) => g.id === result.groupId)?.name || '',
            won: isWin,
            isTieBreak: resolved.isTieBreak,
            isShutout,
            walkover,
            asApoyo: kind === 'apoyo',
            partner: partnerName,
            rivals: rivalSlots.map(nameOf).join(' / '),
            gamesFor: walkover ? null : isWin ? winnerGames : loserGames,
            gamesAgainst: walkover ? null : isWin ? loserGames : winnerGames,
            points,
          });
        });
      });
    });

  const totals = computeStandings(league, groupId).find((r) => r.playerId === playerId);
  const standings = computeStandings(league, groupId);
  const position = standings.findIndex((r) => r.playerId === playerId) + 1;

  // Racha actual (partidos consecutivos ganados o perdidos, desde el último).
  let streak = 0;
  let streakType = null;
  for (let i = matches.length - 1; i >= 0; i--) {
    if (streakType === null) {
      streakType = matches[i].won ? 'W' : 'L';
      streak = 1;
    } else if ((matches[i].won ? 'W' : 'L') === streakType) {
      streak += 1;
    } else break;
  }

  const partners = Array.from(partnerTally.values()).sort((a, b) => b.won - a.won || b.played - a.played);

  return { player, totals, position, totalPlayers: standings.length, matches, partners, streak, streakType };
}

/* -------------------------------------------------------------------------
   Resumen de una jornada
   ------------------------------------------------------------------------- */

/**
 * Todo lo que pasó en UNA fecha de un grupo: cada partido con sus parejas y
 * marcador, y cuánto sumó cada jugador solo en esa fecha.
 */
export function buildFechaSummary(league, groupId, fechaNum) {
  const result = league.results.find((r) => r.groupId === groupId && r.fechaNum === fechaNum);
  const group = league.groups.find((g) => g.id === groupId);
  if (!result || !group) return null;

  const allPlayers = league.groups.flatMap((g) => g.players);
  const label = (slot) => {
    const kind = slotKind(slot);
    if (isAbsentSlot(slot)) return 'Ausente';
    if (kind === 'invitado') return `${slot?.guestName?.trim() || 'Invitado'} (inv.)`;
    const name = allPlayers.find((p) => p.id === slot.playerId)?.name || '—';
    return kind === 'apoyo' ? `${name} (apoyo)` : name;
  };

  const matches = (result.matches || [])
    .map((m) => {
      const r = resolveMatchFull(result, m);
      if (r.status === 'pending' || r.status === 'invalid') return null;
      const walkover = r.status === 'walkover' || r.status === 'walkoverBoth';
      return {
        pair1: slotsForMatch(result, m.p1Idx, m).map(label),
        pair2: slotsForMatch(result, m.p2Idx, m).map(label),
        g1: walkover ? null : r.g1,
        g2: walkover ? null : r.g2,
        winnerIdx: r.winnerIdx,
        isTieBreak: r.isTieBreak,
        walkover,
        walkoverBoth: r.status === 'walkoverBoth',
      };
    })
    .filter(Boolean);

  // Mismos cálculos que la tabla, pero con esta única fecha.
  const rows = computeStandings({ ...league, results: [result] }, groupId)
    .filter((r) => r.pj > 0)
    .sort((a, b) => b.points - a.points || b.pg - a.pg || a.name.localeCompare(b.name));

  const date = group.fechas.find((f) => f.num === fechaNum)?.date || '';
  return { group, fechaNum, date, matches, rows, complete: matches.length === MATCHES_PER_FECHA };
}

/* -------------------------------------------------------------------------
   Texto para compartir
   ------------------------------------------------------------------------- */

export function formatStandingsForShare(rows, group, fechasJugadas, scoring) {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((p, i) => `${medals[i] || `${i + 1}.`} ${p.name} — ${p.points} pts (${p.pg}/${p.pj})`);
  return [
    `🎾 PUNTAKO PÁDEL — ${group.name.toUpperCase()}`,
    `Fechas jugadas: ${fechasJugadas}`,
    '',
    ...lines,
    '',
    `Victoria +${scoring.victoria} · Derrota 7-6 +${scoring.derrotaTieBreak} · Fecha perfecta +${scoring.fechaPerfecta}`,
  ].join('\n');
}
