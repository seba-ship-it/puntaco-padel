import React, { useMemo, useState } from 'react';
import { Trash2, Wallet } from 'lucide-react';
import { SectionTitle } from '../components/ui.jsx';
import { fines60Of } from '../lib/season.js';

const gs = (n) => `${Number(n).toLocaleString('es-PY')} Gs.`;

const TYPES = [
  { id: 'cuota', label: 'Cuota del fijo', fee: 'cuotaFijo', charge: true },
  { id: 'invitado', label: 'Invitado (jornada)', fee: 'invitadoJornada', charge: true },
  { id: 'dobleFalta', label: 'Doble falta', fee: 'dobleFalta', charge: true },
  { id: 'multa', label: 'Otra multa', fee: null, charge: true },
  { id: 'pago', label: 'Pago recibido', fee: null, charge: false },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.id, t.label]));

/**
 * Cuotas, multas y pagos en guaraníes. Solo lo ve quien tiene la clave (la
 * tabla está protegida en la base de datos, no solo oculta en la pantalla).
 * Las multas de 6-0 se calculan solas desde los resultados.
 */
export default function Pagos({ league, finance, onChange }) {
  const players = useMemo(
    () => league.groups.flatMap((g) => g.players.map((p) => ({ ...p, groupName: g.name }))),
    [league.groups],
  );
  const [playerId, setPlayerId] = useState(players[0]?.id || '');
  const [type, setType] = useState('pago');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const fines = useMemo(() => {
    // multas 6-0: la temporada en curso + lo que quedó guardado en el historial
    const total = { ...fines60Of(league) };
    league.history.forEach((s) => Object.entries(s.fines60 || {}).forEach(([id, n]) => { total[id] = (total[id] || 0) + n; }));
    return total;
  }, [league]);

  const rows = players.map((p) => {
    const mine = finance.entries.filter((e) => e.playerId === p.id);
    const manual = mine.filter((e) => e.type !== 'pago').reduce((s, e) => s + e.amount, 0);
    const auto = (fines[p.id] || 0) * finance.fees.multa60;
    const paid = mine.filter((e) => e.type === 'pago').reduce((s, e) => s + e.amount, 0);
    return { ...p, charged: manual + auto, auto, paid, balance: manual + auto - paid };
  });
  const totals = rows.reduce(
    (t, r) => ({ charged: t.charged + r.charged, paid: t.paid + r.paid, balance: t.balance + r.balance }),
    { charged: 0, paid: 0, balance: 0 },
  );

  const chosen = TYPES.find((t) => t.id === type);
  const defaultAmount = chosen.fee ? finance.fees[chosen.fee] : '';

  const addEntry = (e) => {
    e.preventDefault();
    const value = Number(amount === '' ? defaultAmount : amount);
    if (!playerId || !Number.isFinite(value) || value <= 0) return;
    onChange({
      ...finance,
      entries: [
        ...finance.entries,
        { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), playerId, type, amount: value, note: note.trim() },
      ],
    });
    setAmount('');
    setNote('');
  };

  const chargeEveryone = () => {
    if (!window.confirm(`¿Cargar la cuota del fijo (${gs(finance.fees.cuotaFijo)}) a los ${players.length} jugadores?`)) return;
    const date = new Date().toISOString().slice(0, 10);
    onChange({
      ...finance,
      entries: [
        ...finance.entries,
        ...players.map((p, i) => ({ id: `${Date.now()}-${i}`, date, playerId: p.id, type: 'cuota', amount: finance.fees.cuotaFijo, note: '' })),
      ],
    });
  };

  const nameOf = (id) => players.find((p) => p.id === id)?.name || id;
  const input = 'bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500';

  return (
    <div className="space-y-4 pk-fade">
      <SectionTitle
        title="Pagos y multas"
        subtitle="Solo lo ves vos: esta información no aparece para quien mira la liga sin la clave."
        right={
          <button onClick={chargeEveryone} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">
            Cargar cuota del fijo a todos
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        {[['A cobrar', totals.charged, 'text-white'], ['Cobrado', totals.paid, 'text-emerald-400'], ['Pendiente', totals.balance, totals.balance > 0 ? 'text-amber-400' : 'text-emerald-400']].map(([l, v, c]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-slate-500">{l}</p>
            <p className={`text-sm sm:text-base font-black tabular-nums ${c}`}>{gs(v)}</p>
          </div>
        ))}
      </div>

      <form onSubmit={addEntry} className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
        <label className="text-[10px] uppercase font-bold text-slate-500 col-span-2 sm:col-span-1">Jugador
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={`${input} mt-1 w-full`}>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.groupName})</option>)}
          </select>
        </label>
        <label className="text-[10px] uppercase font-bold text-slate-500 col-span-2 sm:col-span-1">Concepto
          <select value={type} onChange={(e) => { setType(e.target.value); setAmount(''); }} className={`${input} mt-1 w-full`}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-[10px] uppercase font-bold text-slate-500">Monto (Gs.)
          <input type="number" min="0" value={amount} placeholder={defaultAmount ? String(defaultAmount) : ''} onChange={(e) => setAmount(e.target.value)} className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-[10px] uppercase font-bold text-slate-500 sm:col-span-2">Nota
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" className={`${input} mt-1 w-full`} />
        </label>
        <button type="submit" className="py-2 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors col-span-2 sm:col-span-1">
          Registrar
        </button>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
              <th className="text-left px-3 py-2">Jugador</th>
              <th className="text-right px-3 py-2">Multas 6-0</th>
              <th className="text-right px-3 py-2">A cobrar</th>
              <th className="text-right px-3 py-2">Pagó</th>
              <th className="text-right px-3 py-2">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-800/60 last:border-0">
                <td className="px-3 py-2 font-semibold text-slate-200">{r.name} <span className="text-slate-600 font-normal">{r.groupName}</span></td>
                <td className="px-3 py-2 text-right text-slate-400 tabular-nums">{r.auto ? gs(r.auto) : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{gs(r.charged)}</td>
                <td className="px-3 py-2 text-right text-emerald-400 tabular-nums">{gs(r.paid)}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${r.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{gs(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> Movimientos
        </h3>
        {finance.entries.length === 0 ? (
          <p className="text-xs text-slate-500">Todavía no registraste nada.</p>
        ) : (
          [...finance.entries].reverse().slice(0, 40).map((e) => (
            <div key={e.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <span className="text-slate-500 tabular-nums">{e.date}</span>
              <span className="font-semibold text-slate-200 flex-1 min-w-0 truncate">
                {nameOf(e.playerId)} · {TYPE_LABEL[e.type] || e.type}{e.note ? ` · ${e.note}` : ''}
              </span>
              <span className={`font-bold tabular-nums ${e.type === 'pago' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {e.type === 'pago' ? '+' : '−'}{gs(e.amount)}
              </span>
              <button
                onClick={() => window.confirm('¿Borrar este movimiento?') && onChange({ ...finance, entries: finance.entries.filter((x) => x.id !== e.id) })}
                className="text-slate-600 hover:text-rose-400" title="Borrar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
