/**
 * Persistencia de la liga.
 *
 * Fuente de verdad: un documento en Firestore (`league/main`), compartido por
 * todos los que abren el link. La liga entera se guarda como un texto JSON en
 * el campo `json`: así se conserva tal cual, sin las restricciones de Firestore
 * con arrays anidados. Ver firestore.rules (lectura pública, escritura solo
 * con la clave).
 *
 * Si la app corre sin las variables de Firebase configuradas (típicamente en
 * desarrollo local), cae a localStorage como modo offline. La build que se
 * publica siempre tiene Firebase configurado vía GitHub Actions.
 */

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  buildDefaultLeague, buildCalendar, slug,
  DEFAULT_FEES, FIRST_SEASON_DATES, SCORING_RULES_VERSION,
} from '../data/defaults.js';
import { db, CLOUD_CONFIGURED } from './firebaseClient.js';

const LEAGUE_DOC = ['league', 'main'];
const FINANCE_DOC = ['finance', 'main'];
const LOCAL_KEY = 'puntaco-padel-v3';
const LEGACY_KEY = 'puntaco-padel-v2';

const parseDoc = (snap) => {
  const raw = snap.exists() ? snap.data()?.json : null;
  return raw ? JSON.parse(raw) : null;
};

/* ---------------------------------------------------------------- lectura */

export async function loadLeague() {
  if (CLOUD_CONFIGURED) {
    let data;
    try {
      data = parseDoc(await getDoc(doc(db, ...LEAGUE_DOC)));
    } catch (error) {
      throw new Error(`No se pudo leer la liga desde la base de datos: ${error.message}`);
    }
    if (data) return normalize(data);

    // Documento todavía no creado (proyecto recién conectado): arrancamos de cero.
    return buildDefaultLeague();
  }

  return loadFromLocalStorage();
}

function loadFromLocalStorage() {
  const current = readKey(LOCAL_KEY);
  if (current) return normalize(current);

  const legacy = readKey(LEGACY_KEY);
  if (legacy) return normalize(migrateFromV2(legacy));

  return buildDefaultLeague();
}

function readKey(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- guardado */

export async function saveLeague(league) {
  if (CLOUD_CONFIGURED) {
    try {
      await setDoc(doc(db, ...LEAGUE_DOC), { json: JSON.stringify(league), updatedAt: serverTimestamp() });
    } catch (error) {
      throw new Error(
        error.code === 'permission-denied'
          ? 'No se pudo guardar: hace falta ingresar con la clave.'
          : `No se pudo guardar en la base de datos: ${error.message}`,
      );
    }
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(league));
  } catch (err) {
    throw new Error('No se pudo guardar (almacenamiento local lleno o bloqueado).');
  }
}

/**
 * Se suscribe a cambios en vivo de la liga (cuando otra persona guarda algo
 * desde otro dispositivo). Devuelve una función para cancelar la suscripción.
 * No hace nada si Firebase no está configurado.
 */
export function subscribeToLeague(onChange) {
  if (!CLOUD_CONFIGURED) return () => {};

  let first = true;
  return onSnapshot(
    doc(db, ...LEAGUE_DOC),
    (snap) => {
      // La primera lectura es el estado inicial, que la carga ya trajo; y los
      // cambios propios pendientes de confirmar no son de otro dispositivo.
      if (first) {
        first = false;
        return;
      }
      if (snap.metadata.hasPendingWrites) return;
      const data = parseDoc(snap);
      if (data) onChange(normalize(data));
    },
    () => {
      /* sin permiso o sin conexión: la carga inicial ya muestra el aviso */
    },
  );
}

/* ------------------------------------------------------------- migración */

/**
 * La versión anterior guardaba los jugadores por nombre. Ahora se guardan por
 * id, así renombrar a alguien no le borra el historial.
 */
function migrateFromV2(old) {
  const league = buildDefaultLeague();
  const saved = Array.isArray(old.savedFechas) ? old.savedFechas : [];

  league.results = saved.map((f) => {
    const groupId = f.group;
    const group = league.groups.find((g) => g.id === groupId);
    const known = new Set((group?.players || []).map((p) => p.id));

    const toSlot = (name, originalName) => {
      const id = slug(name || '');
      const originalId = slug(originalName || '');
      if (!id) return { playerId: null, guestName: null, originalPlayerId: originalId };
      if (known.has(id)) return { playerId: id, guestName: null, originalPlayerId: originalId };
      return { playerId: null, guestName: String(name), originalPlayerId: originalId };
    };

    return {
      groupId,
      fechaNum: Number(f.fechaNum),
      pairs: (f.pairs || []).map((p) => ({
        drive: toSlot(p.drive, p.originalDrive),
        reves: toSlot(p.reves, p.originalReves),
      })),
      matches: f.matches || [],
    };
  });

  return league;
}

/**
 * Rellena lo que falte, para que una liga vieja o un archivo importado no rompa la app.
 *
 * Una liga anterior a la versión 4 (los datos de prueba de las Fechas 1 y 2, con
 * el reglamento viejo) arranca la temporada 1 limpia: se conservan los jugadores
 * y los resultados viejos quedan guardados aparte en `legacy`, sin contar.
 */
function normalize(league) {
  const base = buildDefaultLeague();
  const isOld = (league.version || 3) < 4;
  const rulesOutdated = league.scoringRules !== SCORING_RULES_VERSION;
  const groups = Array.isArray(league.groups) && league.groups.length ? league.groups : base.groups;

  return {
    version: 4,
    scoringRules: SCORING_RULES_VERSION,
    scoring: rulesOutdated ? { ...base.scoring } : { ...base.scoring, ...(league.scoring || {}) },
    seasonNumber: Number.isInteger(league.seasonNumber) && league.seasonNumber > 0 ? league.seasonNumber : base.seasonNumber,
    history: Array.isArray(league.history) ? league.history : [],
    repechaje: league.repechaje ?? null,
    groups: isOld
      ? groups.map((g) => ({ ...g, fechas: buildCalendar(g.players, FIRST_SEASON_DATES) }))
      : groups,
    results: isOld ? [] : Array.isArray(league.results) ? league.results : [],
    legacy: isOld && Array.isArray(league.results) && league.results.length
      ? { note: 'Fechas de prueba anteriores al Reglamento 2026', results: league.results }
      : league.legacy ?? null,
    playoffs: league.playoffs ?? null,
  };
}

/* ---------------------------------------------------------------- finanzas */

/**
 * Cuotas, multas y pagos. Van en una tabla aparte que SOLO puede leer quien
 * tiene la clave: la liga es pública, el dinero de cada jugador no.
 */
const FINANCE_KEY = 'puntaco-finance-v1';

export function emptyFinance() {
  return { fees: { ...DEFAULT_FEES }, entries: [] };
}

function normalizeFinance(data) {
  return {
    fees: { ...DEFAULT_FEES, ...(data?.fees || {}) },
    entries: Array.isArray(data?.entries) ? data.entries : [],
  };
}

export async function loadFinance() {
  if (CLOUD_CONFIGURED) {
    try {
      return normalizeFinance(parseDoc(await getDoc(doc(db, ...FINANCE_DOC))));
    } catch (error) {
      throw new Error(`No se pudo leer los pagos: ${error.message}`);
    }
  }
  return normalizeFinance(readKey(FINANCE_KEY));
}

export async function saveFinance(finance) {
  if (CLOUD_CONFIGURED) {
    try {
      await setDoc(doc(db, ...FINANCE_DOC), { json: JSON.stringify(finance), updatedAt: serverTimestamp() });
    } catch (error) {
      throw new Error(
        error.code === 'permission-denied'
          ? 'No se pudo guardar los pagos: hace falta ingresar con la clave.'
          : `No se pudo guardar los pagos: ${error.message}`,
      );
    }
    return;
  }
  try {
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(finance));
  } catch {
    throw new Error('No se pudo guardar (almacenamiento local lleno o bloqueado).');
  }
}

/* ------------------------------------------------- exportar / importar */

export function exportLeagueFile(league) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(league, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `puntako-liga-${stamp}.json`);
}

export async function readLeagueFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.groups)) {
    throw new Error('El archivo no tiene el formato de una liga de Puntako.');
  }
  return normalize(parsed);
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function resetLeague() {
  const fresh = buildDefaultLeague();
  if (!CLOUD_CONFIGURED) {
    try {
      window.localStorage.removeItem(LOCAL_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* sin acceso a localStorage: no hay nada que borrar */
    }
  }
  return fresh;
}
