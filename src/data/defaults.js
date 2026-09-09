/**
 * Datos iniciales de la liga.
 *
 * Ojo: esto es solo la SEMILLA. Apenas la app arranca por primera vez, copia
 * todo esto a localStorage y desde ahí se edita desde la pantalla "Liga".
 * Tocar este archivo no cambia una liga que ya está en uso.
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
export const DEFAULT_SCORING = {
  victoria: 10,
  derrotaTieBreak: 2,
  derrotaNormal: 0,
  fechaPerfecta: 5,
  apoyoVictoria: 3, // jugador de la liga (de cualquier grupo) que cubre un puesto y gana
  apoyoDerrota: 2, // ídem pero pierde
  bonus60: 2, // extra por ganar un partido 6-0
  penalizacion06: 2, // se resta a quien pierde un partido 0-6
};

const PLAYERS_A = [
  ['Tito', 'Drive'], ['Josexo', 'Drive'], ['LC', 'Drive'], ['Juanba', 'Drive'], ['Diego', 'Drive'],
  ['Faría', 'Revés'], ['Willy', 'Revés'], ['Joshua', 'Revés'], ['Mauri', 'Revés'], ['Benja', 'Revés'],
];

const PLAYERS_B = [
  ['Sebas', 'Drive'], ['Ale', 'Drive'], ['Gusta', 'Drive'], ['Vinchi', 'Drive'], ['José F', 'Drive'],
  ['Josué', 'Revés'], ['Jordan', 'Revés'], ['Fideo', 'Revés'], ['Alejo', 'Revés'], ['Juanki', 'Revés'],
];

/** Calendario por nombres — se convierte a ids más abajo. */
const CALENDAR_A = [
  ['24-ago',  [['Tito', 'Faría'], ['Josexo', 'Willy'], ['LC', 'Joshua'], ['Juanba', 'Mauri'], ['Diego', 'Benja']]],
  ['31-ago',  [['Tito', 'Benja'], ['Josexo', 'Faría'], ['LC', 'Willy'], ['Juanba', 'Joshua'], ['Diego', 'Mauri']]],
  ['7-sept',  [['Tito', 'Mauri'], ['Josexo', 'Benja'], ['LC', 'Faría'], ['Juanba', 'Willy'], ['Diego', 'Joshua']]],
  ['14-sept', [['Tito', 'Joshua'], ['Josexo', 'Mauri'], ['LC', 'Benja'], ['Juanba', 'Faría'], ['Diego', 'Willy']]],
  ['21-sept', [['Tito', 'Willy'], ['Josexo', 'Joshua'], ['LC', 'Mauri'], ['Juanba', 'Benja'], ['Diego', 'Faría']]],
];

const CALENDAR_B = [
  ['24-ago',  [['Sebas', 'Josué'], ['Ale', 'Jordan'], ['Gusta', 'Fideo'], ['Vinchi', 'Alejo'], ['José F', 'Juanki']]],
  ['31-ago',  [['Sebas', 'Juanki'], ['Ale', 'Josué'], ['Gusta', 'Jordan'], ['Vinchi', 'Fideo'], ['José F', 'Alejo']]],
  ['7-sept',  [['Sebas', 'Alejo'], ['Ale', 'Juanki'], ['Gusta', 'Josué'], ['Vinchi', 'Jordan'], ['José F', 'Fideo']]],
  ['14-sept', [['Sebas', 'Fideo'], ['Ale', 'Alejo'], ['Gusta', 'Juanki'], ['Vinchi', 'Josué'], ['José F', 'Jordan']]],
  ['21-sept', [['Sebas', 'Jordan'], ['Ale', 'Fideo'], ['Gusta', 'Alejo'], ['Vinchi', 'Juanki'], ['José F', 'Josué']]],
];

function buildGroup(id, name, players, calendar) {
  return {
    id,
    name,
    players: players.map(([playerName, role]) => ({ id: slug(playerName), name: playerName, role, active: true })),
    fechas: calendar.map(([date, pairs], i) => ({
      num: i + 1,
      date,
      pairs: pairs.map(([drive, reves]) => ({ driveId: slug(drive), revesId: slug(reves) })),
    })),
  };
}

export function buildDefaultLeague() {
  return {
    version: 3,
    scoring: { ...DEFAULT_SCORING },
    groups: [
      buildGroup('A', 'Grupo A', PLAYERS_A, CALENDAR_A),
      buildGroup('B', 'Grupo B', PLAYERS_B, CALENDAR_B),
    ],
    /** Resultados cargados. Uno por (grupo, fecha). */
    results: [],
    /** Fase final. null hasta que se configure desde la pantalla Playoffs. */
    playoffs: null,
  };
}
