/**
 * Toda la matemática de la liga. Sin React: se puede leer, probar y corregir
 * sin abrir la interfaz.
 *
 * Regla de oro: nada derivado se guarda. El ganador, el tie-break y los puntos
 * se recalculan siempre desde el marcador, así nunca quedan datos que se
 * contradigan entre sí.
 */

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
 * - playerId distinto              → "apoyo": otro jugador de la liga (de cualquier
 *                                     grupo) que cubre el puesto. Puntúa fijo según
 *                                     si ganó o perdió (apoyoVictoria / apoyoDerrota).
 * - playerId === null              → invitado externo (guestName), no puntúa nadie
 */
export function slotKind(slot) {
  if (!slot || !slot.playerId) return 'invitado';
  return slot.playerId === slot.originalPlayerId ? 'titular' : 'apoyo';
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
  };
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
    ptsTieBreaks: 0,
    ptsBonus: 0,
    ptsApoyo: 0,
    ptsShutout: 0, // bonus/castigo por partidos 6-0 (positivo o negativo)
  };
}

/**
 * Recorre una fecha y entrega cada partido resuelto junto con los puestos
 * de ambas parejas. Lo comparten la tabla y el perfil de jugador.
 */
function eachResolvedMatch(result, callback) {
  (result.matches || []).forEach((match) => {
    const r = resolveMatch(match);
    if (!r.played) return;

    const winnerPairIdx = r.winnerIdx === 0 ? match.p1Idx : match.p2Idx;
    const loserPairIdx = r.winnerIdx === 0 ? match.p2Idx : match.p1Idx;

    callback({
      match,
      resolved: r,
      winnerPairIdx,
      loserPairIdx,
      winnerGames: r.winnerIdx === 0 ? r.g1 : r.g2,
      loserGames: r.winnerIdx === 0 ? r.g2 : r.g1,
    });
  });
}

function pairSlots(result, pairIdx) {
  const pair = result.pairs?.[pairIdx];
  return pair ? [pair.drive, pair.reves] : [];
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

      eachResolvedMatch(result, ({ resolved, winnerPairIdx, loserPairIdx, winnerGames, loserGames }) => {
        played[winnerPairIdx] += 1;
        played[loserPairIdx] += 1;
        wins[winnerPairIdx] += 1;

        pairSlots(result, winnerPairIdx).forEach((slot) => {
          const kind = slotKind(slot);
          const row = rows.get(slot?.playerId);
          if (!row || kind === 'invitado') return;
          row.pj += 1;
          row.pg += 1;
          row.gamesWon += winnerGames;
          row.gamesLost += loserGames;
          if (kind === 'apoyo') {
            row.apoyoMatches += 1;
            row.ptsApoyo += scoring.apoyoVictoria;
            row.points += scoring.apoyoVictoria;
          } else {
            row.ptsWins += scoring.victoria;
            row.points += scoring.victoria;
          }
          if (winnerGames === 6 && loserGames === 0) {
            row.ptsShutout += scoring.bonus60;
            row.points += scoring.bonus60;
          }
          touched.add(slot.playerId);
        });

        pairSlots(result, loserPairIdx).forEach((slot) => {
          const kind = slotKind(slot);
          const row = rows.get(slot?.playerId);
          if (!row || kind === 'invitado') return;
          row.pj += 1;
          row.gamesWon += loserGames;
          row.gamesLost += winnerGames;
          if (resolved.isTieBreak) row.ppTieBreak += 1;
          else row.ppNormal += 1;
          if (kind === 'apoyo') {
            row.apoyoMatches += 1;
            row.ptsApoyo += scoring.apoyoDerrota;
            row.points += scoring.apoyoDerrota;
          } else {
            const p = resolved.isTieBreak ? scoring.derrotaTieBreak : scoring.derrotaNormal;
            if (resolved.isTieBreak) row.ptsTieBreaks += p;
            row.points += p;
          }
          if (winnerGames === 6 && loserGames === 0) {
            row.ptsShutout -= scoring.penalizacion06;
            row.points -= scoring.penalizacion06;
          }
          touched.add(slot.playerId);
        });
      });

      // Fecha perfecta: la pareja ganó sus 4 partidos. Solo para titulares.
      for (let i = 0; i < PAIRS_PER_FECHA; i++) {
        if (played[i] < PAIRS_PER_FECHA - 1 || wins[i] !== PAIRS_PER_FECHA - 1) continue;
        pairSlots(result, i).forEach((slot) => {
          if (slotKind(slot) !== 'titular') return;
          const row = rows.get(slot.playerId);
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
    if (!slot.playerId) return slot.guestName?.trim() || 'Invitado';
    return allPlayers.find((p) => p.id === slot.playerId)?.name || slot.playerId;
  };
  const fechaDateOf = (result) =>
    league.groups.find((g) => g.id === result.groupId)?.fechas.find((f) => f.num === result.fechaNum)?.date || '';

  const matches = [];
  const partnerTally = new Map();

  // Sin filtrar por grupo: si este jugador fue "apoyo" en una fecha del otro
  // grupo, también aparece acá (el `myIdx === -1` de abajo descarta el resto).
  [...league.results]
    .sort((a, b) => a.fechaNum - b.fechaNum)
    .forEach((result) => {
      eachResolvedMatch(result, ({ resolved, winnerPairIdx, loserPairIdx, winnerGames, loserGames }) => {
        [winnerPairIdx, loserPairIdx].forEach((pairIdx, side) => {
          const isWin = side === 0;
          const slots = pairSlots(result, pairIdx);
          const myIdx = slots.findIndex((s) => s?.playerId === playerId);
          if (myIdx === -1) return;

          const me = slots[myIdx];
          const kind = slotKind(me);
          const partner = slots[myIdx === 0 ? 1 : 0];
          const rivalSlots = pairSlots(result, isWin ? loserPairIdx : winnerPairIdx);

          let points;
          if (kind === 'apoyo') points = isWin ? scoring.apoyoVictoria : scoring.apoyoDerrota;
          else if (isWin) points = scoring.victoria;
          else points = resolved.isTieBreak ? scoring.derrotaTieBreak : scoring.derrotaNormal;

          const isShutout = winnerGames === 6 && loserGames === 0;
          if (isShutout) points += isWin ? scoring.bonus60 : -scoring.penalizacion06;

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
            asApoyo: kind === 'apoyo',
            partner: partnerName,
            rivals: rivalSlots.map(nameOf).join(' / '),
            gamesFor: isWin ? winnerGames : loserGames,
            gamesAgainst: isWin ? loserGames : winnerGames,
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
   Texto para compartir
   ------------------------------------------------------------------------- */

export function formatStandingsForShare(rows, group, fechasJugadas, scoring) {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((p, i) => `${medals[i] || `${i + 1}.`} ${p.name} — ${p.points} pts (${p.pg}/${p.pj})`);
  return [
    `🎾 PUNTACO PÁDEL — ${group.name.toUpperCase()}`,
    `Fechas jugadas: ${fechasJugadas}`,
    '',
    ...lines,
    '',
    `Victoria +${scoring.victoria} · Derrota en TB +${scoring.derrotaTieBreak} · Fecha perfecta +${scoring.fechaPerfecta}`,
  ].join('\n');
}
