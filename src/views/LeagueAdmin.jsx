import React, { useRef, useState } from 'react';
import { Plus, Trash2, Download, Upload, RotateCcw, GripVertical, AlertTriangle, Lock } from 'lucide-react';
import { ROLES, formatDate, isMonday } from '../data/defaults.js';
import { PAIR_COLORS, SectionTitle, themeFor } from '../components/ui.jsx';
import { PAIRS_PER_FECHA } from '../lib/scoring.js';

/**
 * Pantalla "Liga": jugadores, calendario, reglamento y backup.
 * Todo lo que antes había que editar en el código se edita acá.
 */
export default function LeagueAdmin({
  group,
  league,
  canEdit = true,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onUpdateFecha,
  onSetSeasonDate,
  onUpdateScoring,
  onExport,
  onImport,
  onReset,
}) {
  const [tab, setTab] = useState('players'); // players | calendar | scoring | backup
  const theme = themeFor(group.id);

  const tabs = [
    { id: 'players', label: 'Jugadores' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'scoring', label: 'Puntaje' },
    { id: 'backup', label: 'Backup' },
  ];

  return (
    <div className="space-y-4 pk-fade">
      <SectionTitle
        title="Liga"
        accentText={{ text: group.name, className: theme.text }}
        subtitle="Jugadores, calendario, reglas y respaldo de los datos"
      />

      {!canEdit && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-300 font-semibold">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Estás viendo en modo solo lectura. Tocá el candado del header para ingresar la clave y poder editar.
        </div>
      )}

      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 w-fit overflow-x-auto pk-noscroll">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <PlayersTab
          group={group}
          league={league}
          onAddPlayer={onAddPlayer}
          onUpdatePlayer={onUpdatePlayer}
          onDeletePlayer={onDeletePlayer}
          accent={theme.bg}
        />
      )}

      {tab === 'calendar' && (
        <CalendarTab
          group={group}
          league={league}
          onUpdateFecha={onUpdateFecha}
          onSetSeasonDate={onSetSeasonDate}
          accent={theme.bg}
        />
      )}

      {tab === 'scoring' && <ScoringTab scoring={league.scoring} onUpdateScoring={onUpdateScoring} />}

      {tab === 'backup' && (
        <BackupTab league={league} onExport={onExport} onImport={onImport} onReset={onReset} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Jugadores */

function PlayersTab({ group, league, onAddPlayer, onUpdatePlayer, onDeletePlayer, accent }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);

  /**
   * Cuántos partidos tiene cargados: si tiene historial, borrarlo lo destruye.
   * Cuenta también fechas del otro grupo, por si jugó ahí como apoyo.
   */
  const matchCount = (playerId) =>
    league.results.reduce(
        (acc, r) =>
          acc +
          (r.pairs || []).filter((p) => p.drive?.playerId === playerId || p.reves?.playerId === playerId).length,
        0,
      );

  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onAddPlayer(group.id, clean, role);
    setName('');
  };

  const byRole = (r) => group.players.filter((p) => p.role === r);

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Nacho"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg text-xs font-bold text-slate-950 flex items-center gap-1.5 ${accent} hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </form>

      {ROLES.map((r) => (
        <div key={r} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <h3 className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-800 flex items-center justify-between">
            <span>{r}</span>
            <span className="text-slate-600 font-semibold normal-case">{byRole(r).length} jugadores</span>
          </h3>
          <div className="divide-y divide-slate-800/60">
            {byRole(r).length === 0 && (
              <p className="px-4 py-4 text-xs text-slate-500">Todavía no hay jugadores de {r.toLowerCase()}.</p>
            )}
            {byRole(r).map((p) => {
              const count = matchCount(p.id);
              return (
                <div key={p.id} className="px-4 py-2.5 flex items-center gap-2">
                  <input
                    value={p.name}
                    onChange={(e) => onUpdatePlayer(group.id, p.id, { name: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent border border-transparent hover:border-slate-700 focus:border-slate-600 focus:bg-slate-950 rounded-lg px-2 py-1 text-sm font-semibold text-white focus:outline-none transition-colors"
                  />
                  <select
                    value={p.role}
                    onChange={(e) => onUpdatePlayer(group.id, p.id, { role: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
                  >
                    {ROLES.map((rr) => (
                      <option key={rr} value={rr}>
                        {rr}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-600 tabular-nums w-16 text-right shrink-0">
                    {count > 0 ? `${count} part.` : 'sin datos'}
                  </span>
                  <button
                    onClick={() => onDeletePlayer(group.id, p.id, count)}
                    title={count > 0 ? `Tiene ${count} partidos cargados` : 'Borrar jugador'}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Renombrar a un jugador no le borra el historial: internamente se identifica por un id fijo. Para que una fecha
        se pueda cargar hacen falta {PAIRS_PER_FECHA} drives y {PAIRS_PER_FECHA} revés.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------- Calendario */

function CalendarTab({ group, league, onUpdateFecha, onSetSeasonDate, accent }) {
  const drives = group.players.filter((p) => p.role === 'Drive');
  const reveses = group.players.filter((p) => p.role === 'Revés');

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">Temporada {league.seasonNumber}: fechas de juego</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cinco fechas, una por lunes, iguales para los dos grupos. Al cerrar la temporada se arma sola la siguiente
            (con los ascensos y descensos y los lunes siguientes); acá podés corregir cualquier día.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {group.fechas.map((fecha) => (
            <label key={fecha.num} className="text-[10px] uppercase font-bold text-slate-500">
              Fecha {fecha.num}
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(fecha.date) ? fecha.date : ''}
                onChange={(e) => onSetSeasonDate(fecha.num, e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"
              />
              <span className={`block mt-1 normal-case font-semibold ${fecha.date && !isMonday(fecha.date) ? 'text-amber-400' : 'text-slate-500'}`}>
                {fecha.date ? formatDate(fecha.date) : 'sin fecha'}
                {fecha.date && !isMonday(fecha.date) ? ' · no es lunes' : ''}
              </span>
            </label>
          ))}
        </div>
      </div>

      {group.fechas.map((fecha) => (
        <div key={fecha.num} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
            <span className="font-black text-sm text-white shrink-0">Fecha {fecha.num}</span>
            <span className="text-xs text-slate-500">{formatDate(fecha.date)}</span>
          </div>

          <div className="p-3 space-y-2">
            {fecha.pairs.map((pair, pIdx) => (
              <div key={pIdx} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${PAIR_COLORS[pIdx]?.dot || 'bg-slate-500'}`} />
                <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">Pareja {pIdx + 1}</span>
                <select
                  value={pair.driveId}
                  onChange={(e) => onUpdateFecha(group.id, fecha.num, { pairIdx: pIdx, driveId: e.target.value })}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-blue-300 font-semibold focus:outline-none focus:border-slate-500"
                >
                  {drives.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-600 text-xs shrink-0">+</span>
                <select
                  value={pair.revesId}
                  onChange={(e) => onUpdateFecha(group.id, fecha.num, { pairIdx: pIdx, revesId: e.target.value })}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-purple-300 font-semibold focus:outline-none focus:border-slate-500"
                >
                  {reveses.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <DuplicateWarning pairs={fecha.pairs} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Avisa si un jugador quedó en dos parejas de la misma fecha. */
function DuplicateWarning({ pairs }) {
  const seen = new Map();
  pairs.forEach((p) => {
    [p.driveId, p.revesId].forEach((id) => seen.set(id, (seen.get(id) || 0) + 1));
  });
  const dupes = Array.from(seen.entries()).filter(([, n]) => n > 1);
  if (dupes.length === 0) return null;

  return (
    <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5 pt-1">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Hay {dupes.length === 1 ? 'un jugador' : 'jugadores'} repetido{dupes.length === 1 ? '' : 's'} en esta fecha.
    </p>
  );
}

/* ------------------------------------------------------------- Puntaje */

const SCORING_LABELS = {
  victoria: 'Ganar un partido',
  derrotaTieBreak: 'Perder 7-6',
  derrota75: 'Perder 7-5',
  derrotaNormal: 'Perder normalmente',
  fechaPerfecta: 'Bonus por fecha perfecta',
  bonus60: 'Extra por ganar 6-0',
  penalizacion06: 'Se resta por perder 0-6',
  apoyoVictoria: 'Apoyo que gana su partido',
  apoyoDerrota: 'Apoyo que pierde (entrar a jugar)',
  apoyoVictoria60: 'Apoyo: extra por ganar 6-0',
  apoyoDerrotaTieBreak: 'Apoyo: extra por perder 7-6',
  apoyoDerrota06: 'Apoyo: extra por perder 0-6',
};

function ScoringTab({ scoring, onUpdateScoring }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {Object.keys(SCORING_LABELS).map((key) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-300">{SCORING_LABELS[key]}</label>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              value={scoring[key]}
              onChange={(e) => onUpdateScoring(key, e.target.value)}
              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white text-center focus:outline-none focus:border-slate-500"
            />
            <span className="text-xs text-slate-500">pts</span>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 leading-relaxed">
        Los cambios se aplican a toda la temporada al instante: las posiciones se recalculan desde los marcadores, no
        desde puntos guardados.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- Backup */

function BackupTab({ league, onExport, onImport, onReset }) {
  const fileRef = useRef(null);
  const fechasCargadas = league.results.length;

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">Guardar una copia</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Baja un archivo con toda la liga: {league.groups.length} grupos y {fechasCargadas} fecha
            {fechasCargadas === 1 ? '' : 's'} con resultados. Guardalo en Drive o mandátelo por mail.
          </p>
        </div>
        <button
          onClick={onExport}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          Bajar copia de seguridad
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">Restaurar desde un archivo</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reemplaza todo lo que hay ahora por el contenido del archivo. Conviene bajar una copia antes.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = '';
          }}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Elegir archivo
        </button>
      </div>

      <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-rose-200">Empezar de cero</h3>
          <p className="text-xs text-rose-300/70 mt-0.5">
            Borra todos los resultados y vuelve a los jugadores y el calendario originales. No se puede deshacer.
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar la liga
        </button>
      </div>
    </div>
  );
}
