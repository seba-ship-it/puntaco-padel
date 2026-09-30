import React, { useState } from 'react';
import { Check, Trash2, Lock, ImageDown, Link2, MessageCircle, Radio } from 'lucide-react';
import { ProgressBar, RulesPanel, SectionTitle, PAIR_COLORS, themeFor } from '../components/ui.jsx';
import { formatDate } from '../data/defaults.js';
import { MATCHES_PER_FECHA, countPlayed } from '../lib/scoring.js';

/**
 * Calendario e historial en una sola vista: cada fecha muestra su estado y
 * desde ahí se carga o se corrige.
 */
export default function Fechas({
  group,
  league,
  drafts,
  scoring,
  canEdit = true,
  onOpenFecha,
  onExportFecha,
  jornadas = [],
  cloud = false,
  onOpenJornada,
  onCopyJornada,
  onWhatsappJornada,
  onReviewJornada,
  onCancelJornada,
  onDeleteFecha,
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const theme = themeFor(group.id);

  const playerName = (id) => group.players.find((p) => p.id === id)?.name || '—';

  return (
    <div className="space-y-4 pk-fade">
      <SectionTitle
        title="Fechas"
        accentText={{ text: group.name, className: theme.text }}
        subtitle={
          canEdit
            ? 'Tocá una fecha para cargar o corregir sus resultados'
            : 'Estás viendo los resultados. Para cargar hace falta la clave.'
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {group.fechas.map((fecha) => {
          const saved = league.results.find((r) => r.groupId === group.id && r.fechaNum === fecha.num);
          const played = saved ? countPlayed(saved.matches) : 0;
          const hasDraft = Boolean(drafts[`${group.id}-${fecha.num}`]);
          const open = jornadas.find((j) => j.status === 'open' && j.groupId === group.id && j.fechaNum === fecha.num);
          const submitted = open
            ? Object.values(open.matches || {}).filter((m) => m.p1Games !== '' && m.p2Games !== '').length
            : 0;

          return (
            <div key={fecha.num} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-sm text-white">Fecha {fecha.num}</span>
                  <span className="text-xs text-slate-500">{formatDate(fecha.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasDraft && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      Borrador
                    </span>
                  )}
                  <FechaStatus played={played} total={MATCHES_PER_FECHA} />
                </div>
              </div>

              <div className="p-3 space-y-1.5 flex-1">
                {fecha.pairs.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PAIR_COLORS[i]?.dot || 'bg-slate-500'}`} />
                    <span className="text-blue-300 font-semibold">{playerName(p.driveId)}</span>
                    <span className="text-slate-700">+</span>
                    <span className="text-purple-300 font-semibold">{playerName(p.revesId)}</span>
                  </div>
                ))}
              </div>

              {played > 0 && (
                <div className="px-3 pb-2">
                  <ProgressBar done={played} total={MATCHES_PER_FECHA} accent={theme.bg} />
                </div>
              )}

              {open && canEdit && (
                <div className="mx-3 mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    Jornada abierta · {submitted} de {MATCHES_PER_FECHA} partidos cargados por los jugadores
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onCopyJornada(open.token)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700">
                      <Link2 className="w-3.5 h-3.5" /> Copiar link
                    </button>
                    <button onClick={() => onWhatsappJornada(open.token, group.id, fecha.num)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button onClick={() => onReviewJornada(open.token)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-950 ${theme.bg} hover:opacity-90`}>
                      Revisar y cerrar
                    </button>
                    <button onClick={() => onCancelJornada(open.token)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-rose-400">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {!open && canEdit && cloud && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onOpenJornada(group.id, fecha.num)}
                    className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-dashed border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    Abrir jornada (link para que carguen los jugadores)
                  </button>
                </div>
              )}

              <div className="p-3 border-t border-slate-800 flex gap-2">
                {played > 0 && (
                  <button
                    onClick={() => onExportFecha(group.id, fecha.num)}
                    title={`Bajar el resumen de la fecha ${fecha.num} como imagen`}
                    className="px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <ImageDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Resumen</span>
                  </button>
                )}
                <button
                  onClick={() => onOpenFecha(group.id, fecha.num)}
                  title={canEdit ? undefined : 'Necesitás la clave para cargar resultados'}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity ${
                    canEdit
                      ? `text-slate-950 ${theme.bg} hover:opacity-90`
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {!canEdit && <Lock className="w-3.5 h-3.5" />}
                  {played > 0 || hasDraft ? 'Editar resultados' : 'Cargar resultados'}
                </button>
                {canEdit && (played > 0 || hasDraft) && (
                  <button
                    onClick={() => onDeleteFecha(group.id, fecha.num)}
                    title={`Borrar los resultados de la fecha ${fecha.num}`}
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

      <RulesPanel scoring={scoring} open={rulesOpen} onToggle={() => setRulesOpen((v) => !v)} />
    </div>
  );
}

function FechaStatus({ played, total }) {
  if (played === 0) {
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
        Sin cargar
      </span>
    );
  }
  if (played < total) {
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Parcial · {played}/{total}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
      <Check className="w-3 h-3" /> Completa
    </span>
  );
}
