import React from 'react';
import { ArrowLeft, Flame, TrendingUp, TrendingDown, Users, Trophy, Zap } from 'lucide-react';
import { themeFor } from '../components/ui.jsx';

/** Ficha individual: todo lo que hizo un jugador en la temporada. */
export default function PlayerProfile({ profile, group, onBack }) {
  const theme = themeFor(group.id);

  if (!profile || !profile.totals) {
    return (
      <div className="space-y-4 pk-fade">
        <BackButton onBack={onBack} />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-sm text-slate-400">
          No se encontró el jugador.
        </div>
      </div>
    );
  }

  const { player, totals, position, totalPlayers, matches, partners, streak, streakType } = profile;
  const dif = totals.gamesWon - totals.gamesLost;
  const winRate = totals.pj > 0 ? Math.round((totals.pg / totals.pj) * 100) : 0;

  return (
    <div className="space-y-4 pk-fade">
      <BackButton onBack={onBack} />

      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              {player.name}
              {totals.fechasPerfectas > 0 && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  {totals.fechasPerfectas} fecha{totals.fechasPerfectas > 1 ? 's' : ''} perfecta
                  {totals.fechasPerfectas > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {player.role} · {group.name} · {totals.fechasJugadas} fecha{totals.fechasJugadas === 1 ? '' : 's'} jugada
              {totals.fechasJugadas === 1 ? '' : 's'}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-black tabular-nums ${theme.text}`}>{totals.points}</div>
            <div className="text-[11px] text-slate-500 font-semibold">
              puntos · {position}º de {totalPlayers}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Metric label="Partidos" value={totals.pj} />
          <Metric label="Ganados" value={totals.pg} tone="text-emerald-400" />
          <Metric label="% victorias" value={`${winRate}%`} />
          <Metric
            label="Dif. games"
            value={`${dif > 0 ? '+' : ''}${dif}`}
            tone={dif > 0 ? 'text-emerald-400' : dif < 0 ? 'text-rose-400' : 'text-slate-300'}
          />
        </div>

        {streakType && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {streakType === 'W' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
                Racha de {streak} {streak === 1 ? 'victoria' : 'victorias'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                <TrendingDown className="w-3.5 h-3.5" />
                Racha de {streak} {streak === 1 ? 'derrota' : 'derrotas'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* De dónde salen los puntos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">De dónde salen los puntos</h3>
        <div className="space-y-1.5">
          <Breakdown label="Victorias" value={totals.ptsWins} hide={totals.ptsWins === 0} />
          <Breakdown
            label={`Derrotas en tie-break (${totals.ppTieBreak})`}
            value={totals.ptsTieBreaks}
            hide={totals.ptsTieBreaks === 0}
            tone="text-amber-400"
          />
          <Breakdown
            label={`Fechas perfectas (${totals.fechasPerfectas})`}
            value={totals.ptsBonus}
            hide={totals.ptsBonus === 0}
            tone="text-violet-400"
          />
          <Breakdown
            label={`Partidos como apoyo (${totals.apoyoMatches})`}
            value={totals.ptsApoyo}
            hide={totals.ptsApoyo === 0}
            tone="text-sky-400"
          />
          <Breakdown
            label="Partidos 6-0 / 0-6"
            value={totals.ptsShutout}
            hide={totals.ptsShutout === 0}
            tone={totals.ptsShutout > 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-800">
            <span className="text-sm font-bold text-white">Total</span>
            <span className={`text-lg font-black tabular-nums ${theme.text}`}>{totals.points}</span>
          </div>
        </div>
      </div>

      {/* Compañeros */}
      {partners.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Con quién jugó
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {partners.map((c) => (
              <div key={c.name} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200 truncate">{c.name}</span>
                <span className="text-xs text-slate-500 shrink-0 ml-2 tabular-nums">
                  {c.won}/{c.played}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3 border-b border-slate-800 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Historial de partidos
        </h3>
        {matches.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Todavía no jugó ningún partido cargado.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {matches.map((m, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span
                  className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-black ${
                    m.won ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {m.won ? 'G' : 'P'}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">
                    con <span className="font-semibold text-white">{m.partner}</span>
                    <span className="text-slate-600"> vs </span>
                    <span className="text-slate-400">{m.rivals}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>
                      Fecha {m.fechaNum}
                      {m.fechaDate ? ` · ${m.fechaDate}` : ''}
                      {m.crossGroup ? ` · ${m.fechaGroupName}` : ''}
                    </span>
                    {m.isTieBreak && (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />
                        tie-break
                      </span>
                    )}
                    {m.isShutout && (
                      <span className={`font-semibold ${m.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.won ? '6-0 (+bonus)' : '0-6 (−castigo)'}
                      </span>
                    )}
                    {m.asApoyo && <span className="text-sky-400 font-semibold">apoyo</span>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-slate-300 tabular-nums">
                    {m.gamesFor}-{m.gamesAgainst}
                  </div>
                  <div
                    className={`text-[11px] font-bold ${
                      m.points > 0 ? 'text-emerald-400' : m.points < 0 ? 'text-rose-400' : 'text-slate-600'
                    }`}
                  >
                    {m.points > 0 ? `+${m.points}` : m.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver a la tabla
    </button>
  );
}

function Metric({ label, value, tone = 'text-white' }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{label}</div>
      <div className={`text-xl font-black tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Breakdown({ label, value, hide, tone = 'text-emerald-400' }) {
  if (hide) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>
    </div>
  );
}
