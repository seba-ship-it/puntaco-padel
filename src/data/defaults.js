/**
 * Datos iniciales de la liga.
 *
 * Ojo: esto es solo la SEMILLA. Se usa cuando todavía no hay liga guardada; desde
 * ahí se edita desde la pantalla "Liga". Tocar este archivo no cambia una liga
 * que ya está en uso.
 */

/** Convierte "José F" en "jose-f". Los ids no cambian aunque renombres al jugador. */
export function slug(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const ROLES = ['Drive', 'Revés'];

/** Reglamento de puntuación. Editable desde la pantalla "Liga". */
export const SCORING_RULES_VERSION = 3;

/**
 * Revisión de los datos de arranque (jugadores, historial, repechaje). Una liga guardada
 * con otra revisión y SIN ningún partido cargado se reemplaza por la semilla actual.
 */
export const SEED_REV = 2; // Reglamento Puntako Pádel 2026

export const DEFAULT_SCORING = {
  victoria: 10,
  derrotaTieBreak: 4, // derrota 7-6
  derrota75: 2, // derrota 7-5
  derrotaNormal: 0,
  fechaPerfecta: 5,
  bonus60: 2, // extra por ganar un partido 6-0
  penalizacion06: 2, // se resta a quien pierde un partido 0-6
  // Apoyo (jugador del mismo grupo que cubre un puesto).
  apoyoVictoria: 3, // ganar un partido como apoyo
  apoyoDerrota: 2, // entrar a jugar y perder
  // Extras: se SUMAN al puntaje base del apoyo.
  apoyoVictoria60: 4, // extra por ganar 6-0
  apoyoDerrotaTieBreak: 3, // extra por perder 7-6
  apoyoDerrota06: -2, // extra por perder 0-6
};

/** Cuotas y multas, en guaraníes. */
export const DEFAULT_FEES = {
  cuotaFijo: 200000,
  invitadoJornada: 40000,
  multa60: 5000,
  dobleFalta: 5000,
};

/**
 * Grupos de la temporada 2, con los movimientos de la temporada 1 aplicados:
 * Gusta y Alejo suben al A y Joshua baja al B. Juanba Bettini iba a bajar, pero
 * pasa a jugar el repechaje en lugar de José Ferreira (que se ausenta un tiempo),
 * así que se queda en el A y en el B queda un cupo de Drive libre.
 * "Vacante" es un lugar reservado: se renombra desde Liga → Jugadores.
 */
const PLAYERS_A = [
  ['Tito Servián', 'Drive'], ['Luis Campos', 'Drive'], ['Sebas Nuñez', 'Drive'], ['Juanba Bettini', 'Drive'], ['Gusta Riego', 'Drive'],
  ['Pedro Faría', 'Revés'], ['Mauri Melgarejo', 'Revés'], ['Benja Bobadilla', 'Revés'], ['Willy Medina', 'Revés'], ['Alejo Medina', 'Revés'],
];

const PLAYERS_B = [
  ['Ale Rivas', 'Drive'], ['Alex Ivan Alfonso', 'Drive'], ['José Franco', 'Drive'], ['Rodrigo H.', 'Drive'], ['Vacante (Drive B)', 'Drive'],
  ['Joshua Rodgers', 'Revés'], ['Jordan Narváez', 'Revés'], ['Juan Carlos Bettini', 'Revés'], ['Josué Barreto', 'Revés'], ['Pablito García', 'Revés'],
];

/**
 * Tabla final de la temporada 1 (24-ago a 21-sept), tal como quedó publicada:
 * [nombre, fechasJugadas, PJ, PG, puntos, gamesAFavor, gamesEnContra].
 * Está en el orden de la tabla, por puesto.
 */
const SEASON1 = {
  A: {
    Drive: [
      ['Tito Servián', 5, 20, 16, 181, 107, 67], ['Luis Campos', 5, 20, 14, 148, 110, 86],
      ['Sebas Nuñez', 5, 20, 11, 92, 82, 89], ['José Ferreira da C.', 5, 20, 8, 88, 92, 100],
      ['Juanba Bettini', 3, 12, 2, 20, 40, 68],
    ],
    Revés: [
      ['Pedro Faría', 5, 20, 15, 159, 108, 76], ['Mauri Melgarejo', 5, 20, 12, 126, 99, 89],
      ['Benja Bobadilla', 4, 16, 8, 89, 74, 71], ['Willy Medina', 5, 20, 8, 87, 84, 102],
      ['Joshua Rodgers', 5, 20, 7, 77, 90, 105],
    ],
  },
  B: {
    Drive: [
      ['Gusta Riego', 4, 16, 11, 114, 80, 65], ['Ale Rivas', 4, 16, 10, 111, 81, 57],
      ['Alex Ivan Alfonso', 4, 16, 6, 60, 61, 70], ['José Franco', 2, 8, 2, 20, 32, 43],
      ['Rodrigo H.', 0, 0, 0, 0, 0, 0],
    ],
    Revés: [
      ['Alejo Medina', 5, 20, 13, 139, 97, 80], ['Jordan Narváez', 5, 20, 10, 106, 87, 83],
      ['Juan Carlos Bettini', 5, 20, 9, 92, 87, 91], ['Josué Barreto', 3, 12, 8, 80, 60, 54],
      ['Pablito García', 2, 8, 5, 56, 35, 30],
    ],
  },
};

function buildSeason1() {
  const ref = (name, role) => ({ playerId: slug(name), name, role });
  const rows = (groupId) =>
    ['Drive', 'Revés'].flatMap((role) =>
      SEASON1[groupId][role].map(([name, fechas, pj, pg, points, gw, gl]) => ({
        playerId: slug(name), name, role, points, pj, pg, gamesWon: gw, gamesLost: gl, fechasJugadas: fechas,
      })),
    );
  const at = (groupId, role, i) => SEASON1[groupId][role][i][0];
  const players = (groupId) =>
    ['Drive', 'Revés'].flatMap((role) => SEASON1[groupId][role].map(([n]) => ({ id: slug(n), name: n, role })));
  // Movimientos por puesto: 1º de B sube, último de A baja; repechaje: penúltimo de A vs 2º de B.
  return {
    number: 1,
    closedAt: '2026-09-22T00:00:00.000Z',
    dates: ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'],
    groups: [
      { id: 'A', name: 'Grupo A', players: players('A') },
      { id: 'B', name: 'Grupo B', players: players('B') },
    ],
    standings: { A: rows('A'), B: rows('B') },
    champions: {
      A: { Drive: ref(at('A', 'Drive', 0), 'Drive'), 'Revés': ref(at('A', 'Revés', 0), 'Revés') },
      B: { Drive: ref(at('B', 'Drive', 0), 'Drive'), 'Revés': ref(at('B', 'Revés', 0), 'Revés') },
    },
    promoted: [ref(at('B', 'Drive', 0), 'Drive'), ref(at('B', 'Revés', 0), 'Revés')],
    // Juanba (último del A en Drive) iba a bajar, pero juega el repechaje en lugar de José Ferreira.
    relegated: [ref(at('A', 'Revés', 4), 'Revés')],
    notes: 'Juanba Bettini iba a descender directo, pero juega el repechaje en lugar de José Ferreira, que se ausenta por un tiempo. El cupo de Drive que queda libre en el Grupo B se cubre con un jugador nuevo.',
    repechaje: {
      a: { drive: ref(at('A', 'Drive', 4), 'Drive'), reves: ref(at('A', 'Revés', 3), 'Revés') },
      b: { drive: ref(at('B', 'Drive', 1), 'Drive'), reves: ref(at('B', 'Revés', 1), 'Revés') },
    },
    fines60: {},
    results: [],
  };
}

/**
 * Lunes de la temporada en curso (editables desde Liga → Calendario).
 * Las fechas se guardan como "AAAA-MM-DD".
 */
export const FIRST_SEASON_DATES = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const parseIso = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(`${iso}T12:00:00Z`) : null);

/** "2026-10-05" → "lun 5-oct". Si no es una fecha ISO (datos viejos), la devuelve tal cual. */
export function formatDate(iso) {
  const d = parseIso(iso);
  if (!d) return iso || '';
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
}

export const isMonday = (iso) => parseIso(iso)?.getUTCDay() === 1;

/** Las próximas `count` fechas semanales después de `lastDate` (ISO). */
export function nextWeeklyDates(lastDate, count = 5) {
  const base = parseIso(lastDate);
  if (!base) return Array.from({ length: count }, () => '');
  return Array.from({ length: count }, (_, i) =>
    new Date(base.getTime() + (i + 1) * 7 * 86400000).toISOString().slice(0, 10),
  );
}

/**
 * Calendario todos-contra-todos entre drives y revés: en la fecha k, el drive
 * i juega con el revés (i + k) mod n. Cada drive juega una vez con cada revés.
 */
export function buildCalendar(players, dates) {
  const drives = players.filter((p) => p.role === 'Drive');
  const reveses = players.filter((p) => p.role === 'Revés');
  const n = Math.min(drives.length, reveses.length);
  return dates.map((date, k) => ({
    num: k + 1,
    date,
    pairs: Array.from({ length: n }, (_, i) => ({
      driveId: drives[i].id,
      revesId: reveses[(i + k) % n].id,
    })),
  }));
}

function buildGroup(id, name, players, dates) {
  const list = players.map(([playerName, role]) => ({ id: slug(playerName), name: playerName, role, active: true }));
  return { id, name, players: list, fechas: buildCalendar(list, dates) };
}

export function buildDefaultLeague() {
  return {
    version: 4,
    scoringRules: SCORING_RULES_VERSION,
    seedRev: SEED_REV,
    scoring: { ...DEFAULT_SCORING },
    /** Temporada en curso (5 fechas). Al cerrarla pasa al historial. */
    seasonNumber: 2, // la temporada 1 (24-ago a 21-sept) ya se jugó: va al historial
    history: [buildSeason1()],
    /** Repechaje pendiente/jugado (Fecha 1 de la temporada 2): penúltimo del A vs 2º del B. */
    repechaje: {
      fromSeason: 1,
      forSeason: 2,
      a: { driveId: slug('Juanba Bettini'), revesId: slug('Willy Medina') },
      b: { driveId: slug('Ale Rivas'), revesId: slug('Jordan Narváez') },
      scoreA: '',
      scoreB: '',
      winner: null,
      done: false,
    },
    groups: [
      buildGroup('A', 'Grupo A', PLAYERS_A, FIRST_SEASON_DATES),
      buildGroup('B', 'Grupo B', PLAYERS_B, FIRST_SEASON_DATES),
    ],
    /** Resultados cargados de la temporada en curso. Uno por (grupo, fecha). */
    results: [],
    /** Fase final. null hasta que se configure desde la pantalla Playoffs. */
    playoffs: null,
  };
}
