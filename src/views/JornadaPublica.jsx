import React, { useEffect, useRef, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { PAIR_COLORS, themeFor } from '../components/ui.jsx';
import { formatDate } from '../data/defaults.js';
import { buildMatchList } from '../lib/scoring.js';
import { subscribeToJornada, submitJornadaMatch } from '../lib/storage.js';

const NAME_KEY = 'puntako-nombre-jugador';
const clean = (v) => v.replace(/\D/g, '').slice(0, 2);

/**
 * Pantalla a la que llegan los jugadores desde el link de WhatsApp. No pide
 * clave: cada uno carga el marcador de su partido, que queda como "pendiente
 * de revisión" hasta que el admin cierra la jornada.
 */
export default function JornadaPublica({ token, league }) {
  const [jornada, setJornada] = useState(undefined); // undefined = cargando, null = no existe
  const [error, setError] = useState('');
  const [by, setBy] = useState(() => {
    try {
      return window.localStorage.getItem(NAME_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(
    () =>
      subscribeToJornada(token, setJornada, () => {
        setJornada(null);
      }),
    [token],
  );

  const saveName = (v) => {
    setBy(v);
    try {
      window.localStorage.setItem(NAME_KEY, v);
    } catch {
      /* sin almacenamiento: el nombre no se recuerda */
    }
  };

  if (jornada === undefined) return <p className="text-sm text-slate-500 text-center py-10">Cargando jornada…</p>;

  if (jornada === null) {
    return (
      <Aviso titulo="No encontramos esta jornada" texto="El link puede estar mal copiado o la jornada ya no existe. Pedile el link al administrador." />
    );
  }

  const group = league.groups.find((g) => g.id === jornada.groupId);
  const fecha = group?.fechas.find((f) => f.num === jornada.fechaNum);
  if (!group || !fecha) {
    return <Aviso titulo="Jornada no disponible" texto="Esta fecha ya no existe en el calendario." />;
  }
  const theme = themeFor(group.id);

  if (jornada.status !== 'open') {
    return (
      <Aviso
        titulo={`Fecha ${fecha.num} · ${group.name} cerrada`}
        texto="El administrador ya cerró esta jornada y los resultados son oficiales. Los podés ver en la tabla."
      />
    );
  }

  const nameOf = (id) => group.players.find((p) => p.id === id)?.name || '—';
  const matches = buildMatchList();

  const submit = async (matchId, a, b) => {
    setError('');
    try {
      await submitJornadaMatch(token, matchId, a, b, by.trim());
    } catch {
      setError('No se pudo guardar. Revisá la conexión o pedile al admin que reabra la jornada.');
    }
  };

  return (
    <div className="space-y-4 pk-fade">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <h2 className="text-lg font-black text-white leading-tight">
          Fecha {fecha.num} · <span className={theme.text}>{group.name}</span>
        </h2>
        <p className="text-xs text-slate-500">{formatDate(fecha.date)} · Cargá el marcador de tu partido en games</p>
        <input
          value={by}
          onChange={(e) => saveName(e.target.value)}
          placeholder="Tu nombre (así el admin sabe quién cargó)"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Lo que cargues queda pendiente hasta que el admin cierre la jornada. Si jugó un apoyo o un invitado, avisale
          al admin para que lo ajuste.
        </p>
      </div>

      {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

      <div className="space-y-2">
        {matches.map((m, i) => (
          <PartidoCard
            key={m.id}
            index={i}
            m={m}
            pairs={fecha.pairs}
            nameOf={nameOf}
            saved={jornada.matches?.[m.id]}
            onSubmit={(a, b) => submit(m.id, a, b)}
          />
        ))}
      </div>
    </div>
  );
}

function Aviso({ titulo, texto }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
      <Lock className="w-6 h-6 text-slate-600 mx-auto" />
      <h2 className="text-base font-black text-white">{titulo}</h2>
      <p className="text-sm text-slate-400">{texto}</p>
    </div>
  );
}

function PartidoCard({ index, m, pairs, nameOf, saved, onSubmit }) {
  const [a, setA] = useState(saved?.p1Games ?? '');
  const [b, setB] = useState(saved?.p2Games ?? '');
  const timer = useRef(null);
  const touched = useRef(false);

  // Si otro jugador cargó este partido, se ve acá (mientras uno no lo esté editando).
  useEffect(() => {
    if (touched.current) return;
    setA(saved?.p1Games ?? '');
    setB(saved?.p2Games ?? '');
  }, [saved?.p1Games, saved?.p2Games]);

  const change = (which, value) => {
    touched.current = true;
    const na = which === 'a' ? value : a;
    const nb = which === 'b' ? value : b;
    if (which === 'a') setA(value);
    else setB(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (na !== '' && nb !== '' && na === nb) return; // empate: no es un marcador válido
      onSubmit(na, nb);
      touched.current = false;
    }, 700);
  };

  const side = (idx) => {
    const p = pairs[idx];
    return `${nameOf(p.driveId)} / ${nameOf(p.revesId)}`;
  };
  const done = saved && saved.p1Games !== '' && saved.p2Games !== '';
  const tie = a !== '' && a === b;

  return (
    <div className={`bg-slate-900 border rounded-xl p-3 ${done ? 'border-emerald-500/30' : 'border-slate-800'}`}>
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2">
        Partido {index + 1}
        {done && (
          <span className="text-emerald-400 flex items-center gap-1 normal-case">
            <Check className="w-3 h-3" /> cargado{saved.by ? ` por ${saved.by}` : ''}
          </span>
        )}
      </div>
      {[[m.p1Idx, a, 'a'], [m.p2Idx, b, 'b']].map(([idx, val, which]) => (
        <div key={which} className="flex items-center gap-2 py-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${PAIR_COLORS[idx]?.dot || 'bg-slate-500'}`} />
          <span className="flex-1 min-w-0 text-sm text-slate-200 font-semibold truncate">{side(idx)}</span>
          <input
            inputMode="numeric"
            value={val}
            onChange={(e) => change(which, clean(e.target.value))}
            className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-lg font-black text-white text-center focus:outline-none focus:border-emerald-500"
          />
        </div>
      ))}
      {tie && <p className="text-[11px] text-amber-400 font-semibold mt-1">No puede haber empate.</p>}
    </div>
  );
}
