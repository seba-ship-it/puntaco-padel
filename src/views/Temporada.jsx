import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Shield, Trophy, History, Lock } from 'lucide-react';
import { EmptyState, ProgressBar, SectionTitle, themeFor } from '../components/ui.jsx';
import { formatDate } from '../data/defaults.js';
import { planMovements, seasonProgress } from '../lib/season.js';

const ROLE_STYLE = { Drive: 'text-blue-300', Revés: 'text-purple-300' };

/**
 * Temporada en curso (cierre, ascensos, descensos y repechaje) e historial de
 * las temporadas anteriores.
 */
export default function Temporada({ league, canEdit, onCloseSeason, onApplyRepechaje }) {
  const progress = seasonProgress(league);
  const movements = planMovements(league);
  const rep = league.repechaje;
  const nameOf = (id) => league.groups.flatMap((g) => g.players).find((p) => p.id === id)?.name || id;

  return (
    <div className="space-y-5 pk-fade">
      <SectionTitle
        title={`Temporada ${league.seasonNumber}`}
        subtitle="Cinco fechas. Al terminar se define quién asciende, quién desciende y quién juega el repechaje."
      />

      {rep && (
        <RepechajeCard rep={rep} nameOf={nameOf} canEdit={canEdit} seasonNumber={league.seasonNumber} onApply={onApplyRepechaje} />
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white">Cierre de la temporada</h3>
          <span className="text-[11px] text-slate-500">{progress.done} de {progress.total} fechas completas</span>
        </div>
        <ProgressBar done={progress.done} total={progress.total} accent="bg-emerald-500" />

        {movements && progress.done > 0 && <MovementsPreview movements={movements} provisional={!progress.complete} />}

        {canEdit ? (
          <button
            onClick={onCloseSeason}
            disabled={!progress.complete}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {progress.complete
              ? `Cerrar la temporada ${league.seasonNumber} y empezar la ${league.seasonNumber + 1}`
              : 'Completá las 5 fechas de ambos grupos para cerrar'}
          </button>
        ) : (
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Solo quien tiene la clave puede cerrar la temporada.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          Historial de temporadas
        </h3>
        {league.history.length === 0 ? (
          <EmptyState message="Todavía no hay temporadas cerradas. Acá van a aparecer los campeones y los movimientos de cada una." />
        ) : (
          [...league.history].reverse().map((s) => <SeasonCard key={s.number} season={s} repechaje={rep} />)
        )}
      </section>
    </div>
  );
}

function PlayerChip({ p }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="font-bold text-white">{p.name}</span>
      <span className={`text-[10px] font-bold ${ROLE_STYLE[p.role] || 'text-slate-400'}`}>{p.role}</span>
    </span>
  );
}

function MovementsPreview({ movements, provisional }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-1.5">
        <p className="font-bold text-emerald-400 flex items-center gap-1.5"><ArrowUp className="w-3.5 h-3.5" /> Ascienden a A</p>
        {movements.promoted.map((p) => <div key={p.playerId}><PlayerChip p={p} /></div>)}
      </div>
      <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-1.5">
        <p className="font-bold text-rose-400 flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5" /> Descienden a B</p>
        {movements.relegated.map((p) => <div key={p.playerId}><PlayerChip p={p} /></div>)}
      </div>
      <div className="sm:col-span-2 rounded-lg bg-slate-950 border border-amber-500/30 p-3 space-y-1.5">
        <p className="font-bold text-amber-400 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Repechaje (Fecha 1 de la próxima temporada)</p>
        <p className="text-slate-300">
          A: {movements.repechaje.a.drive.name} / {movements.repechaje.a.reves.name}
          <span className="text-slate-600 mx-2">vs</span>
          B: {movements.repechaje.b.drive.name} / {movements.repechaje.b.reves.name}
        </p>
      </div>
      {provisional && (
        <p className="sm:col-span-2 text-[11px] text-slate-500">Provisorio: se define con las posiciones al terminar la Fecha 5.</p>
      )}
    </div>
  );
}

function RepechajeCard({ rep, nameOf, canEdit, seasonNumber, onApply }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const pair = (x) => `${nameOf(x.driveId)} / ${nameOf(x.revesId)}`;

  return (
    <section className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Repechaje · Fecha 1 de la temporada {rep.forSeason}
      </h3>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <p className="text-[10px] uppercase font-bold text-emerald-400">Grupo A · penúltimos</p>
          <p className="font-bold text-white mt-1">{pair(rep.a)}</p>
        </div>
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <p className="text-[10px] uppercase font-bold text-pink-400">Grupo B · segundos</p>
          <p className="font-bold text-white mt-1">{pair(rep.b)}</p>
        </div>
      </div>

      {rep.done ? (
        <p className="text-xs text-slate-300">
          Resultado {rep.scoreA} - {rep.scoreB}.{' '}
          {rep.winner === 'B'
            ? 'Ganó el Grupo B: sube a A y la pareja de A baja a B (desde la Fecha 2).'
            : 'Ganó el Grupo A: se mantienen en sus grupos.'}
        </p>
      ) : canEdit && seasonNumber === rep.forSeason ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onApply(a, b);
          }}
        >
          <label className="text-[10px] uppercase font-bold text-slate-500">
            Games A
            <input type="number" min="0" value={a} onChange={(e) => setA(e.target.value)}
              className="mt-1 block w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center" />
          </label>
          <label className="text-[10px] uppercase font-bold text-slate-500">
            Games B
            <input type="number" min="0" value={b} onChange={(e) => setB(e.target.value)}
              className="mt-1 block w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center" />
          </label>
          <button type="submit" disabled={a === '' || b === ''}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 disabled:opacity-40">
            Registrar resultado
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-400">Pendiente: se juega como partido extra en la primera fecha de la temporada.</p>
      )}
    </section>
  );
}

function SeasonCard({ season, repechaje }) {
  const [open, setOpen] = useState(false);
  const rep = repechaje && repechaje.fromSeason === season.number ? repechaje : null;

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-white">Temporada {season.number}</h4>
          <p className="text-[11px] text-slate-500">
            {formatDate(season.dates?.[0])} – {formatDate(season.dates?.[season.dates.length - 1])}
          </p>
        </div>
        <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {season.groups.map((g) => {
          const t = themeFor(g.id);
          const ch = season.champions?.[g.id];
          return (
            <div key={g.id} className="rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-1">
              <p className={`text-[10px] uppercase font-black ${t.text}`}>Campeones · {g.name}</p>
              {ch?.Drive && <div className="text-xs"><span className="text-blue-300 font-bold mr-1.5">Drive</span><span className="text-white font-bold">{ch.Drive.name}</span></div>}
              {ch?.['Revés'] && <div className="text-xs"><span className="text-purple-300 font-bold mr-1.5">Revés</span><span className="text-white font-bold">{ch['Revés'].name}</span></div>}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 space-y-0.5">
        <p><ArrowUp className="w-3 h-3 inline text-emerald-400 mr-1" />Ascendieron: {season.promoted?.map((p) => p.name).join(' y ')}</p>
        <p><ArrowDown className="w-3 h-3 inline text-rose-400 mr-1" />Descendieron: {season.relegated?.map((p) => p.name).join(' y ')}</p>
        {season.notes && <p className="text-[11px] text-slate-500 pl-4">{season.notes}</p>}
        {season.repechaje && (
          <p>
            <Shield className="w-3 h-3 inline text-amber-400 mr-1" />
            Repechaje: {season.repechaje.a.drive.name} /{' '}
            {season.repechaje.a.reves.name} vs {season.repechaje.b.drive.name} / {season.repechaje.b.reves.name}
            {rep?.done ? ` → ${rep.scoreA}-${rep.scoreB}, ganó ${rep.winner === 'B' ? 'B (asciende)' : 'A (se queda)'}` : rep ? ' → pendiente' : ''}
          </p>
        )}
      </div>

      <button onClick={() => setOpen((v) => !v)} className="text-[11px] font-bold text-slate-400 hover:text-white underline underline-offset-2">
        {open ? 'Ocultar tablas' : 'Ver tablas finales'}
      </button>

      {open && (
        <div className="grid sm:grid-cols-2 gap-2 pk-fade">
          {season.groups.map((g) => (
            <div key={g.id} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
              <p className={`text-xs font-black mb-2 ${themeFor(g.id).text}`}>{g.name}</p>
              {['Drive', 'Revés'].map((role) => (
                <div key={role} className="mb-2 last:mb-0">
                  <p className={`text-[10px] font-bold uppercase ${ROLE_STYLE[role]}`}>{role}</p>
                  {(season.standings?.[g.id] || [])
                    .filter((r) => r.role === role)
                    .map((r, i) => (
                      <div key={r.playerId} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-300">{i + 1}. {r.name}</span>
                        <span className="font-bold text-white tabular-nums">{r.points}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
