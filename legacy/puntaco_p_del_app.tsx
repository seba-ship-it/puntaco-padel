import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Trophy,
  Calendar,
  BarChart3,
  Info,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Share2,
  AlertTriangle,
  Pencil,
  X,
  Zap,
  Flame,
} from 'lucide-react';

/* ==========================================================================
   1. CONFIGURACIÓN — todo lo editable de la liga vive acá arriba
   ========================================================================== */

/** Reglamento de puntuación. Cambiar un número acá cambia toda la app. */
const SCORING = {
  victoria: 10,        // Pts por ganar un partido (a cada jugador de la pareja)
  derrotaTieBreak: 2,  // Pts por perder en tie-break
  derrotaNormal: 0,    // Pts por perder normalmente
  fechaPerfecta: 5,    // Bonus si la pareja gana sus 4 partidos de la fecha
  reemplazo: 3,        // Pts fijos para un jugador de la liga que cubre otro puesto
};

/** Cantidad de parejas por fecha. Define también la cantidad de partidos: C(5,2) = 10. */
const PAIRS_PER_FECHA = 5;

const GROUPS = ['A', 'B'];

const OFFICIAL_CALENDAR = {
  A: {
    1: { date: '24-ago',  pairs: [['Tito', 'Faría'], ['Josexo', 'Willy'], ['LC', 'Joshua'], ['Juanba', 'Mauri'], ['Diego', 'Benja']] },
    2: { date: '31-ago',  pairs: [['Tito', 'Benja'], ['Josexo', 'Faría'], ['LC', 'Willy'], ['Juanba', 'Joshua'], ['Diego', 'Mauri']] },
    3: { date: '7-sept',  pairs: [['Tito', 'Mauri'], ['Josexo', 'Benja'], ['LC', 'Faría'], ['Juanba', 'Willy'], ['Diego', 'Joshua']] },
    4: { date: '14-sept', pairs: [['Tito', 'Joshua'], ['Josexo', 'Mauri'], ['LC', 'Benja'], ['Juanba', 'Faría'], ['Diego', 'Willy']] },
    5: { date: '21-sept', pairs: [['Tito', 'Willy'], ['Josexo', 'Joshua'], ['LC', 'Mauri'], ['Juanba', 'Benja'], ['Diego', 'Faría']] },
  },
  B: {
    1: { date: '24-ago',  pairs: [['Sebas', 'Josué'], ['Ale', 'Jordan'], ['Gusta', 'Fideo'], ['Vinchi', 'Alejo'], ['José F', 'Juanki']] },
    2: { date: '31-ago',  pairs: [['Sebas', 'Juanki'], ['Ale', 'Josué'], ['Gusta', 'Jordan'], ['Vinchi', 'Fideo'], ['José F', 'Alejo']] },
    3: { date: '7-sept',  pairs: [['Sebas', 'Alejo'], ['Ale', 'Juanki'], ['Gusta', 'Josué'], ['Vinchi', 'Jordan'], ['José F', 'Fideo']] },
    4: { date: '14-sept', pairs: [['Sebas', 'Fideo'], ['Ale', 'Alejo'], ['Gusta', 'Juanki'], ['Vinchi', 'Josué'], ['José F', 'Jordan']] },
    5: { date: '21-sept', pairs: [['Sebas', 'Jordan'], ['Ale', 'Fideo'], ['Gusta', 'Alejo'], ['Vinchi', 'Juanki'], ['José F', 'Josué']] },
  },
};

const MAIN_PLAYERS = {
  A: [
    { name: 'Tito', role: 'Drive' }, { name: 'Josexo', role: 'Drive' }, { name: 'LC', role: 'Drive' },
    { name: 'Juanba', role: 'Drive' }, { name: 'Diego', role: 'Drive' },
    { name: 'Faría', role: 'Revés' }, { name: 'Willy', role: 'Revés' }, { name: 'Joshua', role: 'Revés' },
    { name: 'Mauri', role: 'Revés' }, { name: 'Benja', role: 'Revés' },
  ],
  B: [
    { name: 'Sebas', role: 'Drive' }, { name: 'Ale', role: 'Drive' }, { name: 'Gusta', role: 'Drive' },
    { name: 'Vinchi', role: 'Drive' }, { name: 'José F', role: 'Drive' },
    { name: 'Josué', role: 'Revés' }, { name: 'Jordan', role: 'Revés' }, { name: 'Fideo', role: 'Revés' },
    { name: 'Alejo', role: 'Revés' }, { name: 'Juanki', role: 'Revés' },
  ],
};

/** Un color por pareja, para reconocerlas de un vistazo en la pantalla de carga. */
const PAIR_COLORS = [
  { dot: 'bg-emerald-400', ring: 'border-emerald-500/40', soft: 'bg-emerald-500/10', text: 'text-emerald-300' },
  { dot: 'bg-sky-400',     ring: 'border-sky-500/40',     soft: 'bg-sky-500/10',     text: 'text-sky-300' },
  { dot: 'bg-amber-400',   ring: 'border-amber-500/40',   soft: 'bg-amber-500/10',   text: 'text-amber-300' },
  { dot: 'bg-violet-400',  ring: 'border-violet-500/40',  soft: 'bg-violet-500/10',  text: 'text-violet-300' },
  { dot: 'bg-rose-400',    ring: 'border-rose-500/40',    soft: 'bg-rose-500/10',    text: 'text-rose-300' },
];

/** Acento visual por grupo. */
const GROUP_THEME = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500', softBg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'ring-emerald-500/40' },
  B: { text: 'text-pink-400',    bg: 'bg-pink-500',    softBg: 'bg-pink-500/10',    border: 'border-pink-500/30',    ring: 'ring-pink-500/40' },
};

const STORAGE_KEY = 'puntaco-padel-v2';

/* ==========================================================================
   2. LÓGICA PURA — sin React, fácil de leer y de verificar
   ========================================================================== */

/** Genera los 10 enfrentamientos (todos contra todos entre 5 parejas). */
function buildMatchList() {
  const list = [];
  for (let i = 0; i < PAIRS_PER_FECHA; i++) {
    for (let j = i + 1; j < PAIRS_PER_FECHA; j++) {
      list.push({ id: `m_${i}_${j}`, p1Idx: i, p2Idx: j, p1Games: '', p2Games: '', tieBreakOverride: null });
    }
  }
  return list;
}

/**
 * Única fuente de verdad del resultado de un partido: se deriva SIEMPRE del
 * marcador, así nunca puede contradecirse con lo que se ve en pantalla.
 * `tieBreakOverride` es null cuando se deja el valor automático (7-6 / 6-7).
 */
function resolveMatch(match) {
  const raw1 = String(match.p1Games ?? '').trim();
  const raw2 = String(match.p2Games ?? '').trim();

  if (raw1 === '' || raw2 === '') {
    return { played: false, invalid: false, winnerIdx: null, isTieBreak: false, g1: 0, g2: 0 };
  }

  const g1 = Number(raw1);
  const g2 = Number(raw2);

  if (!Number.isFinite(g1) || !Number.isFinite(g2) || g1 < 0 || g2 < 0 || g1 === g2) {
    return { played: false, invalid: true, winnerIdx: null, isTieBreak: false, g1: 0, g2: 0 };
  }

  const autoTieBreak = (g1 === 7 && g2 === 6) || (g1 === 6 && g2 === 7);
  const isTieBreak = match.tieBreakOverride === null || match.tieBreakOverride === undefined
    ? autoTieBreak
    : Boolean(match.tieBreakOverride);

  return { played: true, invalid: false, winnerIdx: g1 > g2 ? 0 : 1, isTieBreak, g1, g2 };
}

/**
 * Clasifica a quien efectivamente jugó en un puesto:
 *  - 'titular'  → es el jugador que le tocaba por calendario. Puntúa normal.
 *  - 'reemplazo'→ es otro jugador de la liga cubriendo el puesto. Puntúa SCORING.reemplazo.
 *  - 'invitado' → alguien de afuera. No puntúa (y el titular ausente tampoco).
 */
function classifyPlayer(name, originalName, rosterNames) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'invitado';
  if (clean === originalName) return 'titular';
  return rosterNames.has(clean) ? 'reemplazo' : 'invitado';
}

/** Cuántos de los 10 partidos de una fecha tienen marcador válido. */
function countPlayed(matches) {
  return matches.reduce((acc, m) => acc + (resolveMatch(m).played ? 1 : 0), 0);
}

/**
 * Recalcula la tabla completa desde cero a partir de los marcadores guardados.
 * No guarda nada derivado: si corregís un marcador, la tabla se corrige sola.
 */
function computeStandings(savedFechas, group) {
  const roster = MAIN_PLAYERS[group] || [];
  const rosterNames = new Set(roster.map((p) => p.name));

  const stats = new Map();
  roster.forEach((p) => {
    stats.set(p.name, {
      name: p.name,
      role: p.role,
      pj: 0,
      pg: 0,
      ppNormal: 0,
      ppTieBreak: 0,
      subMatches: 0,      // partidos jugados cubriendo otro puesto
      fechasPerfectas: 0,
      bonus: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
    });
  });

  savedFechas
    .filter((f) => f.group === group)
    .forEach((fecha) => {
      const wins = Array(PAIRS_PER_FECHA).fill(0);
      const played = Array(PAIRS_PER_FECHA).fill(0);

      // Quién ocupó cada puesto en esta fecha, ya clasificado.
      const slots = fecha.pairs.map((pair) => ([
        { name: String(pair.drive ?? '').trim(), kind: classifyPlayer(pair.drive, pair.originalDrive, rosterNames) },
        { name: String(pair.reves ?? '').trim(), kind: classifyPlayer(pair.reves, pair.originalReves, rosterNames) },
      ]));

      fecha.matches.forEach((match) => {
        const r = resolveMatch(match);
        if (!r.played) return;

        const winnerPairIdx = r.winnerIdx === 0 ? match.p1Idx : match.p2Idx;
        const loserPairIdx = r.winnerIdx === 0 ? match.p2Idx : match.p1Idx;
        const winnerGames = r.winnerIdx === 0 ? r.g1 : r.g2;
        const loserGames = r.winnerIdx === 0 ? r.g2 : r.g1;

        played[match.p1Idx] += 1;
        played[match.p2Idx] += 1;
        wins[winnerPairIdx] += 1;

        // --- Ganadores ---
        slots[winnerPairIdx].forEach((slot) => {
          const st = stats.get(slot.name);
          if (!st || slot.kind === 'invitado') return;
          st.pj += 1;
          st.pg += 1;
          st.gamesWon += winnerGames;
          st.gamesLost += loserGames;
          if (slot.kind === 'reemplazo') {
            st.subMatches += 1;
            st.points += SCORING.reemplazo;
          } else {
            st.points += SCORING.victoria;
          }
        });

        // --- Perdedores ---
        slots[loserPairIdx].forEach((slot) => {
          const st = stats.get(slot.name);
          if (!st || slot.kind === 'invitado') return;
          st.pj += 1;
          st.gamesWon += loserGames;
          st.gamesLost += winnerGames;
          if (r.isTieBreak) st.ppTieBreak += 1;
          else st.ppNormal += 1;

          if (slot.kind === 'reemplazo') {
            st.subMatches += 1;
            st.points += SCORING.reemplazo;
          } else {
            st.points += r.isTieBreak ? SCORING.derrotaTieBreak : SCORING.derrotaNormal;
          }
        });
      });

      // --- Bonus fecha perfecta: la pareja ganó sus 4 partidos. Solo para titulares. ---
      for (let i = 0; i < PAIRS_PER_FECHA; i++) {
        if (played[i] < PAIRS_PER_FECHA - 1 || wins[i] !== PAIRS_PER_FECHA - 1) continue;
        slots[i].forEach((slot) => {
          const st = stats.get(slot.name);
          if (!st || slot.kind !== 'titular') return;
          st.fechasPerfectas += 1;
          st.bonus += SCORING.fechaPerfecta;
          st.points += SCORING.fechaPerfecta;
        });
      }
    });

  // Orden: puntos → partidos ganados → diferencia de games.
  return Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.pg !== a.pg) return b.pg - a.pg;
    return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
  });
}

/** Texto plano listo para pegar en el grupo de WhatsApp. */
function formatStandingsForShare(rows, group, playedFechas) {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((p, i) => {
    const pos = medals[i] || `${i + 1}.`;
    return `${pos} ${p.name} — ${p.points} pts (${p.pg}/${p.pj})`;
  });
  return [
    `🎾 PUNTACO PÁDEL — GRUPO ${group}`,
    `Fechas jugadas: ${playedFechas}`,
    '',
    ...lines,
    '',
    `Victoria +${SCORING.victoria} · Derrota en TB +${SCORING.derrotaTieBreak} · Fecha perfecta +${SCORING.fechaPerfecta}`,
  ].join('\n');
}

/* ==========================================================================
   3. PERSISTENCIA — la liga sobrevive al refresh del navegador
   ========================================================================== */

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      savedFechas: Array.isArray(parsed.savedFechas) ? parsed.savedFechas : [],
      drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
    };
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/* ==========================================================================
   4. COMPONENTES DE UI
   ========================================================================== */

function Toast({ notification }) {
  if (!notification) return null;
  const isError = notification.type === 'error';
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 max-w-[92vw] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border pk-fade ${
        isError
          ? 'bg-rose-950 border-rose-500/50 text-rose-100'
          : 'bg-slate-900 border-emerald-500/50 text-emerald-100'
      }`}
    >
      {isError ? <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" /> : <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
      <span className="text-sm font-medium">{notification.msg}</span>
    </div>
  );
}

/** Reglamento: colapsado por defecto para no competir con el contenido. */
function RulesPanel({ open, onToggle }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Info className="w-4 h-4 text-slate-500" />
          Cómo se puntúa
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pk-fade">
          {[
            { label: 'Ganar un partido', value: `+${SCORING.victoria} pts`, tone: 'text-emerald-400' },
            { label: 'Perder en tie-break', value: `+${SCORING.derrotaTieBreak} pts`, tone: 'text-amber-400' },
            { label: 'Fecha perfecta (4 de 4)', value: `+${SCORING.fechaPerfecta} pts`, tone: 'text-violet-400' },
            { label: 'Jugar cubriendo otro puesto', value: `${SCORING.reemplazo} pts fijos`, tone: 'text-sky-400' },
          ].map((r) => (
            <div key={r.label} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-0.5">{r.label}</span>
              <span className={`font-bold text-sm ${r.tone}`}>{r.value}</span>
            </div>
          ))}
          <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-slate-500 leading-relaxed">
            Si un titular no viene y lo cubre alguien de afuera de la liga, ese partido no suma puntos para nadie.
            El titular ausente nunca suma. Desempates: puntos → partidos ganados → diferencia de games.
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ done, total, accent }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${accent} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-400 tabular-nums whitespace-nowrap">
        {done} de {total}
      </span>
    </div>
  );
}

/** Badge de estado de una fecha. */
function FechaStatus({ played, total }) {
  if (played === 0) {
    return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Sin cargar</span>;
  }
  if (played < total) {
    return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Parcial · {played}/{total}</span>;
  }
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
      <Check className="w-3 h-3" /> Completa
    </span>
  );
}

/** Elige quién ocupa un puesto: titular, otro jugador de la liga, o un invitado. */
function SlotPicker({ label, roleColor, current, original, roster, onChange }) {
  const rosterNames = new Set(roster.map((p) => p.name));
  const isGuest = current !== original && !rosterNames.has(current);
  const kind = classifyPlayer(current, original, rosterNames);

  const selectValue = isGuest ? '__guest__' : current;

  const handleSelect = (value) => {
    if (value === '__guest__') onChange('');
    else onChange(value);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>{label}</label>
        {kind === 'reemplazo' && (
          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded">
            Cubre · {SCORING.reemplazo} pts
          </span>
        )}
        {kind === 'invitado' && current !== original && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
            Invitado · 0 pts
          </span>
        )}
      </div>

      <select
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-slate-500"
      >
        <option value={original}>{original} (titular)</option>
        {roster.filter((p) => p.name !== original).map((p) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
        <option value="__guest__">Invitado de afuera…</option>
      </select>

      {isGuest && (
        <input
          type="text"
          value={current}
          placeholder="Nombre del invitado"
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"
        />
      )}
    </div>
  );
}

/** Una fila de partido: solo se cargan los games, todo lo demás se deduce. */
function MatchRow({ index, match, pairs, onGamesChange, onToggleTieBreak }) {
  const r = resolveMatch(match);
  const p1 = pairs[match.p1Idx];
  const p2 = pairs[match.p2Idx];
  const c1 = PAIR_COLORS[match.p1Idx];
  const c2 = PAIR_COLORS[match.p2Idx];

  const nameOf = (pair) => `${pair?.drive || '—'} / ${pair?.reves || '—'}`;

  const sideClass = (idx) =>
    r.played && r.winnerIdx === idx
      ? 'text-white font-bold'
      : r.played
        ? 'text-slate-500'
        : 'text-slate-300';

  return (
    <div className={`bg-slate-950 border rounded-xl p-3 ${r.invalid ? 'border-rose-500/50' : 'border-slate-800'}`}>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-slate-600 w-5 shrink-0 tabular-nums">{index + 1}</span>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Pareja 1 */}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c1.dot}`} />
            <span className={`text-xs truncate flex-1 ${sideClass(0)}`}>{nameOf(p1)}</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={match.p1Games}
              onChange={(e) => onGamesChange('p1Games', e.target.value)}
              aria-label={`Games de ${nameOf(p1)}`}
              className="w-11 shrink-0 bg-slate-900 border border-slate-700 rounded-md py-1 text-center text-sm font-bold text-white focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Pareja 2 */}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c2.dot}`} />
            <span className={`text-xs truncate flex-1 ${sideClass(1)}`}>{nameOf(p2)}</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={match.p2Games}
              onChange={(e) => onGamesChange('p2Games', e.target.value)}
              aria-label={`Games de ${nameOf(p2)}`}
              className="w-11 shrink-0 bg-slate-900 border border-slate-700 rounded-md py-1 text-center text-sm font-bold text-white focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {(r.played || r.invalid) && (
        <div className="mt-2 pl-8 flex items-center gap-2">
          {r.invalid && (
            <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Marcador inválido (no puede haber empate)
            </span>
          )}
          {r.played && (
            <button
              type="button"
              onClick={onToggleTieBreak}
              title="Marcar o desmarcar que este partido se definió en tie-break"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                r.isTieBreak
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />
              {r.isTieBreak ? `Tie-break · +${SCORING.derrotaTieBreak} al perdedor` : 'Marcar tie-break'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   5. APP
   ========================================================================== */

export default function App() {
  const [view, setView] = useState('standings');       // standings | fechas | load
  const [group, setGroup] = useState('A');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL | Drive | Revés
  const [showDetail, setShowDetail] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [savedFechas, setSavedFechas] = useState([]);
  const [drafts, setDrafts] = useState({});            // { "A-1": { pairs, matches } }
  const [editingKey, setEditingKey] = useState(null);  // "A-1" mientras se carga una fecha
  const [hydrated, setHydrated] = useState(false);
  const [notification, setNotification] = useState(null);

  const theme = GROUP_THEME[group];
  const roster = MAIN_PLAYERS[group] || [];
  const totalMatches = (PAIRS_PER_FECHA * (PAIRS_PER_FECHA - 1)) / 2;

  const showToast = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  // --- Cargar desde localStorage al arrancar ---
  useEffect(() => {
    const stored = loadState();
    if (stored) {
      setSavedFechas(stored.savedFechas);
      setDrafts(stored.drafts);
    }
    setHydrated(true);
  }, []);

  // --- Guardar en localStorage ante cualquier cambio ---
  useEffect(() => {
    if (!hydrated) return;
    persistState({ savedFechas, drafts });
  }, [savedFechas, drafts, hydrated]);

  /* ---------------- Datos derivados ---------------- */

  const standings = useMemo(() => {
    const rows = computeStandings(savedFechas, group);
    return roleFilter === 'ALL' ? rows : rows.filter((p) => p.role === roleFilter);
  }, [savedFechas, group, roleFilter]);

  const groupFechas = useMemo(
    () => savedFechas.filter((f) => f.group === group),
    [savedFechas, group],
  );

  const fechaProgress = useMemo(() => {
    const map = {};
    [1, 2, 3, 4, 5].forEach((n) => {
      const saved = groupFechas.find((f) => f.fechaNum === n);
      map[n] = saved ? countPlayed(saved.matches) : 0;
    });
    return map;
  }, [groupFechas]);

  const fechasCompletas = Object.values(fechaProgress).filter((n) => n === totalMatches).length;
  const fechasConDatos = Object.values(fechaProgress).filter((n) => n > 0).length;

  const editing = editingKey ? drafts[editingKey] : null;
  const editingFechaNum = editingKey ? Number(editingKey.split('-')[1]) : null;
  const editingGroup = editingKey ? editingKey.split('-')[0] : null;
  const editingPlayed = editing ? countPlayed(editing.matches) : 0;

  /* ---------------- Acciones ---------------- */

  /** Abre una fecha para cargar/editar. Reusa el borrador o lo guardado; nunca pisa datos. */
  const openFecha = useCallback((g, fechaNum) => {
    const key = `${g}-${fechaNum}`;

    setDrafts((prev) => {
      if (prev[key]) return prev; // ya hay un borrador en curso, no lo tocamos

      const saved = savedFechas.find((f) => f.group === g && f.fechaNum === fechaNum);
      const calendarData = OFFICIAL_CALENDAR[g]?.[fechaNum];
      if (!calendarData) return prev;

      const pairs = saved
        ? saved.pairs
        : calendarData.pairs.map((p, idx) => ({
            id: `P${idx + 1}`,
            drive: p[0],
            originalDrive: p[0],
            reves: p[1],
            originalReves: p[1],
          }));

      const matches = saved ? saved.matches : buildMatchList();

      return { ...prev, [key]: { pairs, matches } };
    });

    setGroup(g);
    setEditingKey(key);
    setView('load');
  }, [savedFechas]);

  const updateDraft = useCallback((key, updater) => {
    setDrafts((prev) => (prev[key] ? { ...prev, [key]: updater(prev[key]) } : prev));
  }, []);

  const handleSlotChange = (pairIdx, field, value) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      pairs: d.pairs.map((pair, i) => (i === pairIdx ? { ...pair, [field]: value } : pair)),
    }));
  };

  const handleGamesChange = (matchId, field, value) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      matches: d.matches.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)),
    }));
  };

  const handleToggleTieBreak = (matchId) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== matchId) return m;
        return { ...m, tieBreakOverride: !resolveMatch(m).isTieBreak };
      }),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editing || !editingKey) return;

    const invalid = editing.matches.filter((m) => resolveMatch(m).invalid).length;
    if (invalid > 0) {
      showToast(`Hay ${invalid} marcador${invalid > 1 ? 'es' : ''} inválido${invalid > 1 ? 's' : ''}. Corregilo antes de guardar.`, 'error');
      return;
    }
    if (editingPlayed === 0) {
      showToast('Cargá al menos un marcador antes de guardar.', 'error');
      return;
    }

    const g = editingGroup;
    const fechaNum = editingFechaNum;

    setSavedFechas((prev) => {
      const rest = prev.filter((f) => !(f.group === g && f.fechaNum === fechaNum));
      const next = [...rest, {
        id: `${g}-${fechaNum}`,
        group: g,
        fechaNum,
        date: OFFICIAL_CALENDAR[g]?.[fechaNum]?.date ?? '',
        pairs: editing.pairs,
        matches: editing.matches,
      }];
      return next.sort((a, b) => (a.group === b.group ? a.fechaNum - b.fechaNum : a.group.localeCompare(b.group)));
    });

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[editingKey];
      return next;
    });

    setEditingKey(null);
    setView('standings');
    showToast(
      editingPlayed === totalMatches
        ? `Fecha ${fechaNum} del Grupo ${g} guardada completa.`
        : `Fecha ${fechaNum} guardada con ${editingPlayed} de ${totalMatches} partidos.`,
    );
  };

  const handleDiscardDraft = () => {
    if (!editingKey) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[editingKey];
      return next;
    });
    setEditingKey(null);
    setView('fechas');
    showToast('Cambios descartados.');
  };

  const handleDeleteFecha = (g, fechaNum) => {
    setSavedFechas((prev) => prev.filter((f) => !(f.group === g && f.fechaNum === fechaNum)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[`${g}-${fechaNum}`];
      return next;
    });
    showToast(`Fecha ${fechaNum} borrada.`);
  };

  const handleShare = async () => {
    const text = formatStandingsForShare(computeStandings(savedFechas, group), group, fechasConDatos);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Puntaco Pádel — Grupo ${group}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast('Tabla copiada. Pegala en el grupo.');
    } catch {
      showToast('No se pudo copiar la tabla.', 'error');
    }
  };

  /* ---------------- Render ---------------- */

  const navItems = [
    { id: 'standings', label: 'Tabla', icon: BarChart3 },
    { id: 'fechas', label: 'Fechas', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <style>{`
        @keyframes pkFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .pk-fade { animation: pkFade .18s ease-out; }
        .pk-noscroll::-webkit-scrollbar { display: none; }
        .pk-noscroll { scrollbar-width: none; }
      `}</style>

      <Toast notification={notification} />

      {/* ---------- HEADER ---------- */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${theme.softBg} border ${theme.border}`}>
              🎾
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-white leading-tight truncate">
                Puntaco Pádel
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                {fechasCompletas} de 5 fechas completas
              </p>
            </div>
          </div>

          {/* Cambiar de grupo NO borra nada de lo que estés cargando */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => { setGroup(g); if (view === 'load') setView('fechas'); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  group === g ? `${GROUP_THEME[g].bg} text-slate-950` : 'text-slate-400 hover:text-white'
                }`}
              >
                Grupo {g}
              </button>
            ))}
          </div>
        </div>

        {/* Navegación: solo dos destinos. La carga se abre desde una fecha. */}
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 border-t border-slate-800/60 py-1.5 overflow-x-auto pk-noscroll">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                view === id
                  ? `bg-slate-800 ${theme.text}`
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          {view === 'load' && (
            <span className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 ${theme.text} whitespace-nowrap`}>
              <Pencil className="w-3.5 h-3.5" />
              Cargando Fecha {editingFechaNum}
            </span>
          )}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* ================= TABLA ================= */}
        {view === 'standings' && (
          <div className="space-y-4 pk-fade">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  Tabla <span className={theme.text}>Grupo {group}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {fechasConDatos === 0 ? 'Todavía no hay resultados cargados' : `Acumulado de ${fechasConDatos} fecha${fechasConDatos > 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={handleShare}
                disabled={fechasConDatos === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Compartir
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'Drive', label: 'Drive' },
                  { id: 'Revés', label: 'Revés' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRoleFilter(f.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      roleFilter === f.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowDetail((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDetail ? 'rotate-90' : ''}`} />
                {showDetail ? 'Ocultar detalle' : 'Ver detalle'}
              </button>
            </div>

            {fechasConDatos === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
                <p className="text-sm text-slate-400">Cargá los resultados de una fecha para ver la tabla.</p>
                <button
                  onClick={() => setView('fechas')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-slate-950 ${theme.bg}`}
                >
                  Ir a las fechas
                </button>
              </div>
            ) : (
              <>
                {/* --- Móvil: tarjetas --- */}
                <div className="md:hidden space-y-2">
                  {standings.map((p, idx) => (
                    <div key={p.name} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400'
                          : idx === 1 ? 'bg-slate-400/20 text-slate-300'
                          : idx === 2 ? 'bg-amber-800/30 text-amber-600'
                          : 'text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                            {p.name}
                            {p.fechasPerfectas > 0 && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.role} · {p.pg} de {p.pj} ganados
                          </div>
                        </div>
                        <div className={`text-lg font-black tabular-nums ${theme.text}`}>{p.points}</div>
                      </div>

                      {showDetail && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-[11px]">
                          <div><div className="text-slate-500">Perdidos</div><div className="font-bold text-slate-300">{p.ppNormal}</div></div>
                          <div><div className="text-slate-500">En TB</div><div className="font-bold text-amber-400">{p.ppTieBreak}</div></div>
                          <div><div className="text-slate-500">Bonus</div><div className="font-bold text-violet-400">{p.bonus}</div></div>
                          <div><div className="text-slate-500">Dif. games</div><div className={`font-bold ${p.gamesWon - p.gamesLost > 0 ? 'text-emerald-400' : p.gamesWon - p.gamesLost < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {p.gamesWon - p.gamesLost > 0 ? '+' : ''}{p.gamesWon - p.gamesLost}
                          </div></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* --- Escritorio: tabla --- */}
                <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-3 font-bold text-center w-12">#</th>
                          <th className="py-3 px-3 font-bold">Jugador</th>
                          <th className="py-3 px-3 font-bold text-center">Rol</th>
                          <th className="py-3 px-3 font-bold text-center" title="Partidos jugados">PJ</th>
                          <th className="py-3 px-3 font-bold text-center" title="Partidos ganados">PG</th>
                          {showDetail && <>
                            <th className="py-3 px-3 font-bold text-center" title="Partidos perdidos">PP</th>
                            <th className="py-3 px-3 font-bold text-center text-amber-500" title="Derrotas en tie-break">TB</th>
                            <th className="py-3 px-3 font-bold text-center text-violet-400" title="Bonus por fecha perfecta">Bonus</th>
                            <th className="py-3 px-3 font-bold text-center" title="Games ganados / perdidos">Games</th>
                            <th className="py-3 px-3 font-bold text-center" title="Diferencia de games">Dif.</th>
                          </>}
                          <th className={`py-3 px-4 font-bold text-center ${theme.text}`}>Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {standings.map((p, idx) => {
                          const dif = p.gamesWon - p.gamesLost;
                          return (
                            <tr key={p.name} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                                  idx === 0 ? 'bg-amber-500/20 text-amber-400'
                                  : idx === 1 ? 'bg-slate-400/20 text-slate-300'
                                  : idx === 2 ? 'bg-amber-800/30 text-amber-600'
                                  : 'text-slate-600'
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-100 flex items-center gap-2">
                                  {p.name}
                                  {p.fechasPerfectas > 0 && (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                      <Flame className="w-3 h-3" />{p.fechasPerfectas}
                                    </span>
                                  )}
                                  {p.subMatches > 0 && (
                                    <span
                                      title={`${p.subMatches} partido(s) jugados cubriendo otro puesto`}
                                      className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                    >
                                      {p.subMatches} cubre
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                  p.role === 'Drive' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                }`}>{p.role}</span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 tabular-nums">{p.pj}</td>
                              <td className="py-3 px-3 text-center font-bold text-emerald-400 tabular-nums">{p.pg}</td>
                              {showDetail && <>
                                <td className="py-3 px-3 text-center text-slate-400 tabular-nums">{p.ppNormal}</td>
                                <td className="py-3 px-3 text-center text-amber-400 tabular-nums">{p.ppTieBreak}</td>
                                <td className="py-3 px-3 text-center text-violet-400 tabular-nums">{p.bonus || '—'}</td>
                                <td className="py-3 px-3 text-center text-slate-400 text-xs tabular-nums">{p.gamesWon}/{p.gamesLost}</td>
                                <td className={`py-3 px-3 text-center text-xs font-bold tabular-nums ${
                                  dif > 0 ? 'text-emerald-400' : dif < 0 ? 'text-rose-400' : 'text-slate-500'
                                }`}>{dif > 0 ? `+${dif}` : dif}</td>
                              </>}
                              <td className={`py-3 px-4 text-center font-black text-base tabular-nums ${theme.text}`}>{p.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <RulesPanel open={rulesOpen} onToggle={() => setRulesOpen((v) => !v)} />
          </div>
        )}

        {/* ================= FECHAS (calendario + historial en una sola vista) ================= */}
        {view === 'fechas' && (
          <div className="space-y-4 pk-fade">
            <div>
              <h2 className="text-lg font-black text-white">
                Fechas <span className={theme.text}>Grupo {group}</span>
              </h2>
              <p className="text-xs text-slate-500">Tocá una fecha para cargar o corregir sus resultados</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5].map((fNum) => {
                const data = OFFICIAL_CALENDAR[group]?.[fNum];
                if (!data) return null;

                const played = fechaProgress[fNum];
                const hasDraft = Boolean(drafts[`${group}-${fNum}`]);
                const saved = groupFechas.find((f) => f.fechaNum === fNum);
                const pairsToShow = saved ? saved.pairs : data.pairs.map((p) => ({ drive: p[0], reves: p[1] }));

                return (
                  <div key={fNum} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-sm text-white">Fecha {fNum}</span>
                        <span className="text-xs text-slate-500">{data.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasDraft && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            Borrador
                          </span>
                        )}
                        <FechaStatus played={played} total={totalMatches} />
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5 flex-1">
                      {pairsToShow.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PAIR_COLORS[i].dot}`} />
                          <span className="text-blue-300 font-semibold">{p.drive}</span>
                          <span className="text-slate-700">+</span>
                          <span className="text-purple-300 font-semibold">{p.reves}</span>
                        </div>
                      ))}
                    </div>

                    {played > 0 && (
                      <div className="px-3 pb-2">
                        <ProgressBar done={played} total={totalMatches} accent={theme.bg} />
                      </div>
                    )}

                    <div className="p-3 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => openFecha(group, fNum)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold text-slate-950 ${theme.bg} hover:opacity-90 transition-opacity`}
                      >
                        {played > 0 || hasDraft ? 'Editar resultados' : 'Cargar resultados'}
                      </button>
                      {(played > 0 || hasDraft) && (
                        <button
                          onClick={() => handleDeleteFecha(group, fNum)}
                          title={`Borrar la fecha ${fNum}`}
                          className="px-3 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <RulesPanel open={rulesOpen} onToggle={() => setRulesOpen((v) => !v)} />
          </div>
        )}

        {/* ================= CARGAR / EDITAR UNA FECHA ================= */}
        {view === 'load' && editing && (
          <form onSubmit={handleSave} className="space-y-4 pk-fade">

            {/* Cabecera fija con el progreso */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white leading-tight">
                    Fecha {editingFechaNum} · <span className={theme.text}>Grupo {editingGroup}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {OFFICIAL_CALENDAR[editingGroup]?.[editingFechaNum]?.date} · Cargá solo los games, el resto se calcula solo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  title="Descartar cambios y volver"
                  className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ProgressBar done={editingPlayed} total={totalMatches} accent={theme.bg} />
            </div>

            {/* Parejas — solo se abre si hubo cambios de jugadores */}
            <details className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
              <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-300 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <span>¿Faltó alguien? Cambiar las parejas</span>
                <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {editing.pairs.map((pair, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${PAIR_COLORS[idx].ring} ${PAIR_COLORS[idx].soft} space-y-3`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${PAIR_COLORS[idx].dot}`} />
                      <span className="text-[10px] uppercase font-black text-slate-400">Pareja {idx + 1}</span>
                    </div>
                    <SlotPicker
                      label="Drive"
                      roleColor="text-blue-300"
                      current={pair.drive}
                      original={pair.originalDrive}
                      roster={roster}
                      onChange={(v) => handleSlotChange(idx, 'drive', v)}
                    />
                    <SlotPicker
                      label="Revés"
                      roleColor="text-purple-300"
                      current={pair.reves}
                      original={pair.originalReves}
                      roster={roster}
                      onChange={(v) => handleSlotChange(idx, 'reves', v)}
                    />
                  </div>
                ))}
              </div>
            </details>

            {/* Los 10 partidos */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                Marcadores · {totalMatches} partidos
              </h3>
              {editing.matches.map((match, i) => (
                <MatchRow
                  key={match.id}
                  index={i}
                  match={match}
                  pairs={editing.pairs}
                  onGamesChange={(field, value) => handleGamesChange(match.id, field, value)}
                  onToggleTieBreak={() => handleToggleTieBreak(match.id)}
                />
              ))}
            </div>

            {/* Barra de guardado pegada abajo */}
            <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-slate-950/95 backdrop-blur border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {editingPlayed} de {totalMatches} cargados
              </span>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-lg font-black text-sm text-slate-950 flex items-center gap-2 ${theme.bg} hover:opacity-90 transition-opacity`}
              >
                <Check className="w-4 h-4" />
                Guardar fecha
              </button>
            </div>
          </form>
        )}

        {view === 'load' && !editing && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-400">No hay ninguna fecha abierta.</p>
            <button onClick={() => setView('fechas')} className={`px-4 py-2 rounded-lg text-xs font-bold text-slate-950 ${theme.bg}`}>
              Elegir una fecha
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-2 text-[11px] text-slate-600">
          <Trophy className="w-3.5 h-3.5" />
          Puntaco Pádel · los datos se guardan en este navegador
        </div>
      </footer>
    </div>
  );
}
