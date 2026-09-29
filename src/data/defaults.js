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
export const SCORING_RULES_VERSION = 2; // Reglamento Puntako Pádel 2026

export const DEFAULT_SCORING = {
  victoria: 10,
  derrotaTieBreak: 4, // derrota 7-6
  derrota75: 2, // derrota 7-5
  derrotaNormal: 0,
  fechaPerfecta: 5,
  bonus60: 2, // extra por ganar un partido 6-0
  penalizacion06: 2, // se resta a quien pierde un partido 0-6
  // Apoyo (jugador del mismo grupo que cubre un puesto). Son totales por partido.
  apoyoVictoria: 3,
  apoyoDerrota: 2, // entrar a jugar y perder
  apoyoVictoria60: 4, // ganar 6-0
  apoyoDerrotaTieBreak: 3, // perder 7-6
  apoyoDerrota06: -2, // perder 0-6
};

/** Cuotas y multas, en guaraníes. */
export const DEFAULT_FEES = {
  cuotaFijo: 200000,
  invitadoJornada: 40000,
  multa60: 5000,
  dobleFalta: 5000,
};

const PLAYERS_A = [
  ['Tito', 'Drive'], ['Josexo', 'Drive'], ['LC', 'Drive'], ['Juanba', 'Drive'], ['Diego', 'Drive'],
  ['Faría', 'Revés'], ['Willy', 'Revés'], ['Joshua', 'Revés'], ['Mauri', 'Revés'], ['Benja', 'Revés'],
];

const PLAYERS_B = [
  ['Sebas', 'Drive'], ['Ale', 'Drive'], ['Gusta', 'Drive'], ['Vinchi', 'Drive'], ['José F', 'Drive'],
  ['Josué', 'Revés'], ['Jordan', 'Revés'], ['Fideo', 'Revés'], ['Alejo', 'Revés'], ['Juanki', 'Revés'],
];

/** Lunes de la primera temporada (editables desde Liga → Calendario). */
export const FIRST_SEASON_DATES = ['5-oct', '12-oct', '19-oct', '26-oct', '2-nov'];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Las próximas `count` fechas semanales después de "2-nov" (o la que sea). */
export function nextWeeklyDates(lastDate, count = 5, year = new Date().getFullYear()) {
  const m = /^(\d{1,2})-([a-záéíóú]+)/i.exec(String(lastDate || '').trim());
  const monthIdx = m ? MONTHS.findIndex((x) => m[2].toLowerCase().startsWith(x.slice(0, 3))) : -1;
  if (!m || monthIdx < 0) return Array.from({ length: count }, (_, i) => `Fecha ${i + 1}`);
  const base = new Date(Date.UTC(year, monthIdx, Number(m[1])));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getTime() + (i + 1) * 7 * 86400000);
    return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
  });
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
    scoring: { ...DEFAULT_SCORING },
    /** Temporada en curso (5 fechas). Al cerrarla pasa al historial. */
    seasonNumber: 1,
    history: [],
    /** Partido de repechaje pendiente/jugado (fecha 1 de la temporada siguiente). */
    repechaje: null,
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
