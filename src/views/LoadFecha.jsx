import React, { useState } from 'react';
import { X, Check, ChevronDown, AlertTriangle, Zap, Users } from 'lucide-react';
import { ProgressBar, PAIR_COLORS, themeFor } from '../components/ui.jsx';
import { MATCHES_PER_FECHA, resolveMatch, slotKind, countPlayed, slotsForMatch } from '../lib/scoring.js';

/**
 * Carga de resultados de una fecha.
 * Solo se ingresan los games: el ganador, el tie-break y los puntos se deducen.
 */
export default function LoadFecha({
  group,
  otherGroup,
  fechaNum,
  fechaDate,
  draft,
  scoring,
  onSlotChange,
  onGamesChange,
  onToggleTieBreak,
  onLineupChange,
  onResetLineup,
  onSave,
  onDiscard,
}) {
  const theme = themeFor(group.id);
  const played = countPlayed(draft.matches);
  const allPlayers = [...group.players, ...(otherGroup?.players || [])];

  const nameOf = (slot) => {
    if (!slot) return '—';
    if (!slot.playerId) return slot.guestName?.trim() || 'Invitado';
    return allPlayers.find((p) => p.id === slot.playerId)?.name || '—';
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4 pk-fade"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white leading-tight">
              Fecha {fechaNum} · <span className={theme.text}>{group.name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {fechaDate} · Cargá solo los games, el resto se calcula solo
            </p>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            title="Descartar cambios y volver"
            className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ProgressBar done={played} total={MATCHES_PER_FECHA} accent={theme.bg} />
      </div>

      {/* Cambios de jugadores: plegado, porque lo normal es que jueguen los titulares */}
      <details className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
        <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-300 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
          <span>¿Faltó alguien? Cambiar las parejas</span>
          <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {draft.pairs.map((pair, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${PAIR_COLORS[idx]?.ring || 'border-slate-700'} ${PAIR_COLORS[idx]?.soft || ''} space-y-3`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${PAIR_COLORS[idx]?.dot || 'bg-slate-500'}`} />
                <span className="text-[10px] uppercase font-black text-slate-400">Pareja {idx + 1}</span>
              </div>
              <SlotPicker
                label="Drive"
                roleColor="text-blue-300"
                slot={pair.drive}
                players={group.players}
                otherGroup={otherGroup}
                scoring={scoring}
                onChange={(next) => onSlotChange(idx, 'drive', next)}
              />
              <SlotPicker
                label="Revés"
                roleColor="text-purple-300"
                slot={pair.reves}
                players={group.players}
                otherGroup={otherGroup}
                scoring={scoring}
                onChange={(next) => onSlotChange(idx, 'reves', next)}
              />
            </div>
          ))}
        </div>
      </details>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
          Marcadores · {MATCHES_PER_FECHA} partidos
        </h3>
        {draft.matches.map((match, i) => (
          <MatchRow
            key={match.id}
            index={i}
            match={match}
            draft={draft}
            players={group.players}
            otherGroup={otherGroup}
            scoring={scoring}
            nameOf={nameOf}
            onGamesChange={(field, value) => onGamesChange(match.id, field, value)}
            onToggleTieBreak={() => onToggleTieBreak(match.id)}
            onLineupChange={(pairIdx, field, slot) => onLineupChange(match.id, pairIdx, field, slot)}
            onResetLineup={() => onResetLineup(match.id)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-slate-950/95 backdrop-blur border-t border-slate-800 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {played} de {MATCHES_PER_FECHA} cargados
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
  );
}

/**
 * Elige quién ocupó un puesto: el titular, un "apoyo" (otro jugador de la
 * liga, de este grupo o del otro), o un invitado de afuera.
 */
function SlotPicker({ label, roleColor, slot, players, otherGroup, scoring, onChange }) {
  const kind = slotKind(slot);
  const isGuest = !slot.playerId;
  const original = players.find((p) => p.id === slot.originalPlayerId);

  const handleSelect = (value) => {
    if (value === '__guest__') {
      onChange({ ...slot, playerId: null, guestName: '' });
    } else {
      onChange({ ...slot, playerId: value, guestName: null });
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>{label}</label>
        {kind === 'apoyo' && (
          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded">
            Apoyo · {scoring.apoyoDerrota}/{scoring.apoyoVictoria} pts
          </span>
        )}
        {isGuest && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
            Invitado · 0 pts
          </span>
        )}
      </div>

      <select
        value={isGuest ? '__guest__' : slot.playerId}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-slate-500"
      >
        {original && <option value={original.id}>{original.name} (titular)</option>}
        <optgroup label="Apoyo de este grupo">
          {players
            .filter((p) => p.id !== slot.originalPlayerId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </optgroup>
        {otherGroup && otherGroup.players.length > 0 && (
          <optgroup label={`Apoyo de ${otherGroup.name}`}>
            {otherGroup.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
        <option value="__guest__">Invitado de afuera…</option>
      </select>

      {isGuest && (
        <input
          type="text"
          value={slot.guestName || ''}
          placeholder="Nombre del invitado"
          onChange={(e) => onChange({ ...slot, playerId: null, guestName: e.target.value })}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"
        />
      )}
    </div>
  );
}

/**
 * Una fila de partido. Además del marcador, permite cambiar quién jugó
 * SOLO en este partido: el apoyo suele entrar para un partido suelto, no
 * para toda la fecha.
 */
function MatchRow({
  index,
  match,
  draft,
  players,
  otherGroup,
  scoring,
  nameOf,
  onGamesChange,
  onToggleTieBreak,
  onLineupChange,
  onResetLineup,
}) {
  const [editing, setEditing] = useState(false);
  const r = resolveMatch(match);
  const hasLineup = Boolean(match.lineup && Object.keys(match.lineup).length > 0);

  const sideClass = (idx) =>
    r.played && r.winnerIdx === idx ? 'text-white font-bold' : r.played ? 'text-slate-500' : 'text-slate-300';

  const label = (pairIdx) => slotsForMatch(draft, pairIdx, match).map(nameOf).join(' / ');

  const sides = [
    { pairIdx: match.p1Idx, field: 'p1Games', value: match.p1Games, color: PAIR_COLORS[match.p1Idx] },
    { pairIdx: match.p2Idx, field: 'p2Games', value: match.p2Games, color: PAIR_COLORS[match.p2Idx] },
  ];

  return (
    <div className={`bg-slate-950 border rounded-xl p-3 ${r.invalid ? 'border-rose-500/50' : 'border-slate-800'}`}>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-slate-600 w-5 shrink-0 tabular-nums">{index + 1}</span>

        <div className="flex-1 min-w-0 space-y-1.5">
          {sides.map((side, i) => (
            <div key={side.field} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${side.color?.dot || 'bg-slate-500'}`} />
              <span className={`text-xs truncate flex-1 ${sideClass(i)}`}>{label(side.pairIdx)}</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={side.value}
                onChange={(e) => onGamesChange(side.field, e.target.value)}
                aria-label={`Games de ${label(side.pairIdx)}`}
                className="w-11 shrink-0 bg-slate-900 border border-slate-700 rounded-md py-1 text-center text-sm font-bold text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pl-8 flex items-center gap-2 flex-wrap">
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
            {r.isTieBreak ? `Tie-break · +${scoring.derrotaTieBreak} al perdedor` : 'Marcar tie-break'}
          </button>
        )}

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
            hasLineup
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
        >
          <Users className="w-3 h-3" />
          {hasLineup ? 'Jugadores cambiados' : '¿Faltó alguien en este partido?'}
        </button>

        {hasLineup && (
          <button
            type="button"
            onClick={onResetLineup}
            title="Volver a los jugadores por defecto de la fecha"
            className="text-[10px] font-semibold text-slate-500 hover:text-white underline"
          >
            deshacer
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 pl-8 grid grid-cols-1 sm:grid-cols-2 gap-3 pk-fade">
          {sides.map((side) => {
            const slots = slotsForMatch(draft, side.pairIdx, match);
            return (
              <div
                key={side.pairIdx}
                className={`p-2.5 rounded-lg border ${side.color?.ring || 'border-slate-700'} ${side.color?.soft || ''} space-y-2`}
              >
                <span className="text-[10px] uppercase font-black text-slate-400">Pareja {side.pairIdx + 1}</span>
                <SlotPicker
                  label="Drive"
                  roleColor="text-blue-300"
                  slot={slots[0]}
                  players={players}
                  otherGroup={otherGroup}
                  scoring={scoring}
                  onChange={(next) => onLineupChange(side.pairIdx, 'drive', next)}
                />
                <SlotPicker
                  label="Revés"
                  roleColor="text-purple-300"
                  slot={slots[1]}
                  players={players}
                  otherGroup={otherGroup}
                  scoring={scoring}
                  onChange={(next) => onLineupChange(side.pairIdx, 'reves', next)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
