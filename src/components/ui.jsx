import React from 'react';
import { Check, AlertTriangle, Info, ChevronDown } from 'lucide-react';

/** Acento visual por grupo. */
export const GROUP_THEME = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500', softBg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  B: { text: 'text-pink-400', bg: 'bg-pink-500', softBg: 'bg-pink-500/10', border: 'border-pink-500/30' },
};

export function themeFor(groupId) {
  return GROUP_THEME[groupId] || GROUP_THEME.A;
}

/** Un color por pareja, para reconocerlas de un vistazo. */
export const PAIR_COLORS = [
  { dot: 'bg-emerald-400', ring: 'border-emerald-500/40', soft: 'bg-emerald-500/10' },
  { dot: 'bg-sky-400', ring: 'border-sky-500/40', soft: 'bg-sky-500/10' },
  { dot: 'bg-amber-400', ring: 'border-amber-500/40', soft: 'bg-amber-500/10' },
  { dot: 'bg-violet-400', ring: 'border-violet-500/40', soft: 'bg-violet-500/10' },
  { dot: 'bg-rose-400', ring: 'border-rose-500/40', soft: 'bg-rose-500/10' },
];

export function Toast({ notification }) {
  if (!notification) return null;
  const isError = notification.type === 'error';
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 max-w-[92vw] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border pk-fade ${
        isError ? 'bg-rose-950 border-rose-500/50 text-rose-100' : 'bg-slate-900 border-emerald-500/50 text-emerald-100'
      }`}
    >
      {isError ? (
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
      ) : (
        <Check className="w-4 h-4 shrink-0 text-emerald-400" />
      )}
      <span className="text-sm font-medium">{notification.msg}</span>
    </div>
  );
}

export function ProgressBar({ done, total, accent }) {
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

export function RulesPanel({ scoring, open, onToggle }) {
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
            { label: 'Ganar un partido', value: `+${scoring.victoria} pts`, tone: 'text-emerald-400' },
            { label: 'Perder 7-6', value: `+${scoring.derrotaTieBreak} pts`, tone: 'text-amber-400' },
            { label: 'Perder 7-5', value: `+${scoring.derrota75} pts`, tone: 'text-amber-400' },
            { label: 'Fecha perfecta (4 de 4)', value: `+${scoring.fechaPerfecta} pts`, tone: 'text-violet-400' },
            { label: 'Apoyo que gana', value: `${scoring.apoyoVictoria} pts (6-0: ${scoring.apoyoVictoria60})`, tone: 'text-sky-400' },
            { label: 'Apoyo que pierde', value: `${scoring.apoyoDerrota} pts (7-6: ${scoring.apoyoDerrotaTieBreak} · 0-6: ${scoring.apoyoDerrota06})`, tone: 'text-sky-400' },
            { label: 'Ganar un partido 6-0', value: `+${scoring.bonus60} pts extra`, tone: 'text-emerald-400' },
            { label: 'Perder un partido 0-6', value: `-${scoring.penalizacion06} pts`, tone: 'text-rose-400' },
          ].map((r) => (
            <div key={r.label} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-0.5">{r.label}</span>
              <span className={`font-bold text-sm ${r.tone}`}>{r.value}</span>
            </div>
          ))}
          <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-slate-500 leading-relaxed">
            Si falta un titular, puede cubrirlo un <strong className="text-slate-300">apoyo</strong> (jugador del mismo
            grupo y del mismo puesto) o un <strong className="text-slate-300">invitado externo</strong> (alguien de
            afuera). El invitado nunca suma puntos, y el titular ausente tampoco. Con invitado de compañero no aplican
            los extras (6-0, derrotas 7-6 / 7-5, fecha perfecta). Desempates: puntos → partidos ganados → diferencia
            de games.
          </p>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ message, actionLabel, onAction, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
      <p className="text-sm text-slate-400">{message}</p>
      {actionLabel && (
        <button onClick={onAction} className={`px-4 py-2 rounded-lg text-xs font-bold text-slate-950 ${accent}`}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function PositionBadge({ index, size = 'md' }) {
  const tone =
    index === 0
      ? 'bg-amber-500/20 text-amber-400'
      : index === 1
        ? 'bg-slate-400/20 text-slate-300'
        : index === 2
          ? 'bg-amber-800/30 text-amber-600'
          : 'text-slate-600';
  const dim = size === 'sm' ? 'w-6 h-6 text-[11px]' : 'w-7 h-7 text-xs';
  return (
    <span className={`${dim} shrink-0 rounded-full inline-flex items-center justify-center font-black ${tone}`}>
      {index + 1}
    </span>
  );
}

export function SectionTitle({ title, accentText, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-white">
          {title} {accentText && <span className={accentText.className}>{accentText.text}</span>}
        </h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
