import React, { useState } from 'react';
import { Share2, ImageDown, ChevronRight, Flame } from 'lucide-react';
import { PositionBadge, EmptyState, RulesPanel, SectionTitle, themeFor } from '../components/ui.jsx';

/**
 * Tabla de posiciones.
 * Arranca mostrando lo esencial; el detalle del cálculo se despliega aparte.
 * En celular son tarjetas, en pantalla grande es tabla.
 */
export default function Standings({
  standings,
  group,
  scoring,
  fechasJugadas,
  onOpenPlayer,
  onShareText,
  onShareImage,
  onGoToFechas,
}) {
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showDetail, setShowDetail] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const theme = themeFor(group.id);

  const rows = roleFilter === 'ALL' ? standings : standings.filter((p) => p.role === roleFilter);

  if (fechasJugadas === 0) {
    return (
      <div className="space-y-4 pk-fade">
        <SectionTitle
          title="Tabla"
          accentText={{ text: group.name, className: theme.text }}
          subtitle="Todavía no hay resultados cargados"
        />
        <EmptyState
          message="Cargá los resultados de una fecha para ver la tabla."
          actionLabel="Ir a las fechas"
          onAction={onGoToFechas}
          accent={theme.bg}
        />
        <RulesPanel scoring={scoring} open={rulesOpen} onToggle={() => setRulesOpen((v) => !v)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pk-fade">
      <SectionTitle
        title="Tabla"
        accentText={{ text: group.name, className: theme.text }}
        subtitle={`Acumulado de ${fechasJugadas} fecha${fechasJugadas > 1 ? 's' : ''}`}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={onShareImage}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ImageDown className="w-3.5 h-3.5" />
              Bajar imagen
            </button>
            <button
              onClick={onShareText}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Copiar texto
            </button>
          </div>
        }
      />

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

      {/* Celular */}
      <div className="md:hidden space-y-2">
        {rows.map((p, idx) => {
          const dif = p.gamesWon - p.gamesLost;
          return (
            <button
              key={p.playerId}
              onClick={() => onOpenPlayer(p.playerId)}
              className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PositionBadge index={idx} />
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
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>

              {showDetail && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-[11px]">
                  <Stat label="Perdidos" value={p.ppNormal} />
                  <Stat label="En TB" value={p.ppTieBreak} tone="text-amber-400" />
                  <Stat label="Bonus" value={p.bonus || '—'} tone="text-violet-400" />
                  <Stat
                    label="Dif. games"
                    value={`${dif > 0 ? '+' : ''}${dif}`}
                    tone={dif > 0 ? 'text-emerald-400' : dif < 0 ? 'text-rose-400' : 'text-slate-400'}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pantalla grande */}
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
                {showDetail && (
                  <>
                    <th className="py-3 px-3 font-bold text-center" title="Partidos perdidos">PP</th>
                    <th className="py-3 px-3 font-bold text-center text-amber-500" title="Derrotas en tie-break">TB</th>
                    <th className="py-3 px-3 font-bold text-center text-violet-400" title="Bonus por fecha perfecta">Bonus</th>
                    <th className="py-3 px-3 font-bold text-center" title="Games ganados / perdidos">Games</th>
                    <th className="py-3 px-3 font-bold text-center" title="Diferencia de games">Dif.</th>
                  </>
                )}
                <th className={`py-3 px-4 font-bold text-center ${theme.text}`}>Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((p, idx) => {
                const dif = p.gamesWon - p.gamesLost;
                return (
                  <tr
                    key={p.playerId}
                    onClick={() => onOpenPlayer(p.playerId)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 text-center">
                      <PositionBadge index={idx} />
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100 flex items-center gap-2">
                        {p.name}
                        {p.fechasPerfectas > 0 && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                            <Flame className="w-3 h-3" />
                            {p.fechasPerfectas}
                          </span>
                        )}
                        {p.apoyoMatches > 0 && (
                          <span
                            title={`${p.apoyoMatches} partido(s) jugados como apoyo, cubriendo otro puesto`}
                            className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          >
                            {p.apoyoMatches} apoyo
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          p.role === 'Drive' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 tabular-nums">{p.pj}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400 tabular-nums">{p.pg}</td>
                    {showDetail && (
                      <>
                        <td className="py-3 px-3 text-center text-slate-400 tabular-nums">{p.ppNormal}</td>
                        <td className="py-3 px-3 text-center text-amber-400 tabular-nums">{p.ppTieBreak}</td>
                        <td className="py-3 px-3 text-center text-violet-400 tabular-nums">{p.bonus || '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-400 text-xs tabular-nums">
                          {p.gamesWon}/{p.gamesLost}
                        </td>
                        <td
                          className={`py-3 px-3 text-center text-xs font-bold tabular-nums ${
                            dif > 0 ? 'text-emerald-400' : dif < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {dif > 0 ? `+${dif}` : dif}
                        </td>
                      </>
                    )}
                    <td className={`py-3 px-4 text-center font-black text-base tabular-nums ${theme.text}`}>
                      {p.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RulesPanel scoring={scoring} open={rulesOpen} onToggle={() => setRulesOpen((v) => !v)} />
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-300' }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className={`font-bold ${tone}`}>{value}</div>
    </div>
  );
}
