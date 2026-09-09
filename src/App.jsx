import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Calendar, Settings, Pencil, Trophy, RefreshCw } from 'lucide-react';

import { buildDefaultLeague, slug } from './data/defaults.js';
import {
  PAIRS_PER_FECHA,
  buildFechaDraft,
  buildMatchList,
  computeStandings,
  countInvalid,
  countPlayed,
  emptySlot,
  buildPlayerProfile,
  formatStandingsForShare,
  resolveMatch,
} from './lib/scoring.js';
import {
  loadLeague,
  saveLeague,
  subscribeToLeague,
  exportLeagueFile,
  readLeagueFile,
  resetLeague,
} from './lib/storage.js';
import { SUPABASE_CONFIGURED } from './lib/supabaseClient.js';
import { useAuth } from './lib/auth.js';
import { downloadStandingsImage } from './lib/exportImage.js';
import { Toast, themeFor } from './components/ui.jsx';
import AuthGate from './components/AuthGate.jsx';

import Standings from './views/Standings.jsx';
import Fechas from './views/Fechas.jsx';
import LoadFecha from './views/LoadFecha.jsx';
import PlayerProfile from './views/PlayerProfile.jsx';
import LeagueAdmin from './views/LeagueAdmin.jsx';

const DRAFTS_KEY = 'puntaco-drafts-v3';

export default function App() {
  // Arranca con una liga vacía válida (no null) para que todos los hooks de
  // abajo corran siempre en el mismo orden; la real llega enseguida, async.
  const [league, setLeague] = useState(() => buildDefaultLeague());
  const [syncing, setSyncing] = useState(true);
  const hydrated = useRef(false);
  const skipNextSave = useRef(false);
  const lastSaved = useRef(null); // para reconocer el eco de nuestro propio guardado

  const [drafts, setDrafts] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFTS_KEY) || '{}') || {};
    } catch {
      return {};
    }
  });
  const [view, setView] = useState('standings'); // standings | fechas | load | player | admin
  const [groupId, setGroupId] = useState('A');
  const [editingKey, setEditingKey] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [notification, setNotification] = useState(null);

  const { canEdit, signIn, signOut } = useAuth();

  const showToast = useCallback((msg, type = 'success') => setNotification({ msg, type }), []);

  /** Envuelve una acción que modifica datos: sin la clave, avisa y no hace nada. */
  const requireAuth = useCallback(
    (fn) =>
      (...args) => {
        if (!canEdit) {
          showToast('Necesitás la clave para cargar o editar. Tocá el candado 🔒 arriba.', 'error');
          return undefined;
        }
        return fn(...args);
      },
    [canEdit, showToast],
  );

  useEffect(() => {
    if (!notification) return undefined;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  /* ------------------------------------------------- carga y guardado */

  // Carga inicial desde la base de datos (o localStorage si no hay Supabase configurado).
  useEffect(() => {
    let cancelled = false;
    loadLeague()
      .then((loaded) => {
        if (!cancelled) setLeague(loaded);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.message || 'No se pudo cargar la liga.', 'error');
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Cambios en vivo: si otra persona guarda desde otro dispositivo, esta pantalla se actualiza sola.
  useEffect(() => {
    return subscribeToLeague((next) => {
      // Supabase también nos devuelve nuestros propios cambios. Si lo que llega
      // es exactamente lo último que guardamos, es el eco: no hay nada que hacer.
      if (JSON.stringify(next) === lastSaved.current) return;

      skipNextSave.current = true;
      setLeague(next);
      showToast('La liga se actualizó desde otro dispositivo.');
    });
  }, [showToast]);

  // Guarda cada cambio, salvo el que acabamos de recibir por la carga inicial o en vivo.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      lastSaved.current = JSON.stringify(league);
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      lastSaved.current = JSON.stringify(league);
      return;
    }
    lastSaved.current = JSON.stringify(league);
    saveLeague(league).catch((err) => showToast(err.message || 'No se pudo guardar.', 'error'));
  }, [league, showToast]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      /* sin espacio: los borradores se pierden, los resultados guardados no */
    }
  }, [drafts]);

  const group = league.groups.find((g) => g.id === groupId) || league.groups[0];
  const theme = themeFor(group.id);

  /* --------------------------------------------------- datos derivados */

  const standings = useMemo(() => computeStandings(league, group.id), [league, group.id]);

  const fechasJugadas = useMemo(
    () =>
      league.results.filter((r) => r.groupId === group.id && countPlayed(r.matches) > 0).length,
    [league, group.id],
  );

  const fechasCompletas = useMemo(
    () =>
      league.results.filter((r) => r.groupId === group.id && countPlayed(r.matches) === 10).length,
    [league, group.id],
  );

  const editing = editingKey ? drafts[editingKey] : null;
  const editingFechaNum = editingKey ? Number(editingKey.split('-')[1]) : null;
  const editingGroup = editingKey ? league.groups.find((g) => g.id === editingKey.split('-')[0]) : null;

  const profile = useMemo(
    () => (selectedPlayerId ? buildPlayerProfile(league, group.id, selectedPlayerId) : null),
    [league, group.id, selectedPlayerId],
  );

  /* ------------------------------------------------------- helpers */

  /** Aplica un cambio a un grupo concreto, sin mutar el resto de la liga. */
  const patchGroup = (targetGroupId, updater) => {
    setLeague((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === targetGroupId ? updater(g) : g)),
    }));
  };

  const updateDraft = (key, updater) => {
    setDrafts((prev) => (prev[key] ? { ...prev, [key]: updater(prev[key]) } : prev));
  };

  /* ----------------------------------------------- carga de una fecha */

  const openFecha = (gId, fechaNum) => {
    const key = `${gId}-${fechaNum}`;
    const targetGroup = league.groups.find((g) => g.id === gId);
    if (!targetGroup) return;

    setDrafts((prev) => {
      if (prev[key]) return prev; // ya hay un borrador en curso

      const saved = league.results.find((r) => r.groupId === gId && r.fechaNum === fechaNum);
      if (saved) {
        return { ...prev, [key]: { pairs: saved.pairs, matches: saved.matches } };
      }
      const fresh = buildFechaDraft(targetGroup, fechaNum);
      return fresh ? { ...prev, [key]: fresh } : prev;
    });

    setGroupId(gId);
    setEditingKey(key);
    setView('load');
  };

  const handleSlotChange = (pairIdx, field, nextSlot) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      pairs: d.pairs.map((pair, i) => (i === pairIdx ? { ...pair, [field]: nextSlot } : pair)),
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
      matches: d.matches.map((m) => (m.id === matchId ? { ...m, tieBreakOverride: !resolveMatch(m).isTieBreak } : m)),
    }));
  };

  /** Cambia quién jugó un puesto SOLO en este partido (el apoyo entra por partido). */
  const handleLineupChange = (matchId, pairIdx, field, nextSlot) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== matchId) return m;
        const lineup = { ...(m.lineup || {}) };
        lineup[pairIdx] = { ...(lineup[pairIdx] || {}), [field]: nextSlot };
        return { ...m, lineup };
      }),
    }));
  };

  /** Vuelve este partido a la formación por defecto de la fecha. */
  const handleResetLineup = (matchId) => {
    updateDraft(editingKey, (d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== matchId) return m;
        const { lineup, ...rest } = m;
        return rest;
      }),
    }));
  };

  const handleSaveFecha = () => {
    if (!editing || !editingKey) return;
    if (!canEdit) {
      showToast('Se cerró tu sesión de edición. Volvé a ingresar la clave.', 'error');
      return;
    }

    const invalid = countInvalid(editing.matches);
    if (invalid > 0) {
      showToast(
        `Hay ${invalid} marcador${invalid > 1 ? 'es' : ''} inválido${invalid > 1 ? 's' : ''}. Corregilo antes de guardar.`,
        'error',
      );
      return;
    }

    const played = countPlayed(editing.matches);
    if (played === 0) {
      showToast('Cargá al menos un marcador antes de guardar.', 'error');
      return;
    }

    const gId = editingKey.split('-')[0];
    const fechaNum = Number(editingKey.split('-')[1]);

    setLeague((prev) => ({
      ...prev,
      results: [
        ...prev.results.filter((r) => !(r.groupId === gId && r.fechaNum === fechaNum)),
        { groupId: gId, fechaNum, pairs: editing.pairs, matches: editing.matches },
      ].sort((a, b) => (a.groupId === b.groupId ? a.fechaNum - b.fechaNum : a.groupId.localeCompare(b.groupId))),
    }));

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[editingKey];
      return next;
    });

    setEditingKey(null);
    setView('standings');
    showToast(
      played === 10
        ? `Fecha ${fechaNum} guardada completa.`
        : `Fecha ${fechaNum} guardada con ${played} de 10 partidos.`,
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

  const handleDeleteResults = (gId, fechaNum) => {
    if (!window.confirm(`¿Borrar los resultados de la fecha ${fechaNum}? La fecha queda en el calendario.`)) return;
    setLeague((prev) => ({
      ...prev,
      results: prev.results.filter((r) => !(r.groupId === gId && r.fechaNum === fechaNum)),
    }));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[`${gId}-${fechaNum}`];
      return next;
    });
    showToast(`Resultados de la fecha ${fechaNum} borrados.`);
  };

  /* ------------------------------------------------------- jugadores */

  const handleAddPlayer = (gId, name, role) => {
    const targetGroup = league.groups.find((g) => g.id === gId);
    const base = slug(name) || 'jugador';
    let id = base;
    let n = 2;
    while (targetGroup.players.some((p) => p.id === id)) id = `${base}-${n++}`;

    patchGroup(gId, (g) => ({ ...g, players: [...g.players, { id, name, role, active: true }] }));
    showToast(`${name} agregado como ${role}.`);
  };

  const handleUpdatePlayer = (gId, playerId, patch) => {
    patchGroup(gId, (g) => ({
      ...g,
      players: g.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
    }));
  };

  const handleDeletePlayer = (gId, playerId, matchCount) => {
    const targetGroup = league.groups.find((g) => g.id === gId);
    const player = targetGroup.players.find((p) => p.id === playerId);
    const inCalendar = targetGroup.fechas.some((f) =>
      f.pairs.some((p) => p.driveId === playerId || p.revesId === playerId),
    );

    let msg = `¿Borrar a ${player.name}?`;
    if (matchCount > 0) msg += `\n\nTiene ${matchCount} partidos cargados: sus puntos desaparecen de la tabla.`;
    if (inCalendar) msg += `\n\nAdemás está en el calendario. Vas a tener que elegir quién lo reemplaza en esas fechas.`;
    if (!window.confirm(msg)) return;

    patchGroup(gId, (g) => ({ ...g, players: g.players.filter((p) => p.id !== playerId) }));
    showToast(`${player.name} borrado.`);
  };

  /* ------------------------------------------------------ calendario */

  const handleUpdateFecha = (gId, fechaNum, patch) => {
    patchGroup(gId, (g) => ({
      ...g,
      fechas: g.fechas.map((f) => {
        if (f.num !== fechaNum) return f;
        if (patch.pairIdx !== undefined) {
          const { pairIdx, ...rest } = patch;
          return { ...f, pairs: f.pairs.map((p, i) => (i === pairIdx ? { ...p, ...rest } : p)) };
        }
        return { ...f, ...patch };
      }),
    }));
  };

  const handleAddFecha = (gId) => {
    const targetGroup = league.groups.find((g) => g.id === gId);
    const drives = targetGroup.players.filter((p) => p.role === 'Drive');
    const reveses = targetGroup.players.filter((p) => p.role === 'Revés');

    if (drives.length < PAIRS_PER_FECHA || reveses.length < PAIRS_PER_FECHA) {
      showToast(
        `Faltan jugadores: hacen falta ${PAIRS_PER_FECHA} drives y ${PAIRS_PER_FECHA} revés (hay ${drives.length} y ${reveses.length}).`,
        'error',
      );
      return;
    }

    const nextNum = targetGroup.fechas.reduce((max, f) => Math.max(max, f.num), 0) + 1;

    // Rota los revés una posición por fecha, que es cómo está armado el fixture original.
    const shift = (nextNum - 1) % PAIRS_PER_FECHA;
    const pairs = Array.from({ length: PAIRS_PER_FECHA }, (_, i) => ({
      driveId: drives[i].id,
      revesId: reveses[(i + shift) % PAIRS_PER_FECHA].id,
    }));

    patchGroup(gId, (g) => ({ ...g, fechas: [...g.fechas, { num: nextNum, date: '', pairs }] }));
    showToast(`Fecha ${nextNum} agregada. Ponele la fecha del calendario y ajustá las parejas.`);
  };

  const handleDeleteCalendarFecha = (gId, fechaNum, hasResults) => {
    let msg = `¿Borrar la fecha ${fechaNum} del calendario?`;
    if (hasResults) msg += `\n\nTiene resultados cargados y también se van a borrar.`;
    if (!window.confirm(msg)) return;

    patchGroup(gId, (g) => ({ ...g, fechas: g.fechas.filter((f) => f.num !== fechaNum) }));
    setLeague((prev) => ({
      ...prev,
      results: prev.results.filter((r) => !(r.groupId === gId && r.fechaNum === fechaNum)),
    }));
    showToast(`Fecha ${fechaNum} borrada del calendario.`);
  };

  /* --------------------------------------------------------- puntaje */

  const handleUpdateScoring = (key, value) => {
    const n = Number(value);
    setLeague((prev) => ({
      ...prev,
      scoring: { ...prev.scoring, [key]: Number.isFinite(n) ? n : 0 },
    }));
  };

  /* ---------------------------------------------------------- backup */

  const handleExport = () => {
    exportLeagueFile(league);
    showToast('Copia de seguridad descargada.');
  };

  const handleImport = async (file) => {
    try {
      const imported = await readLeagueFile(file);
      if (!window.confirm('Esto reemplaza todos los datos actuales. ¿Seguir?')) return;
      setLeague(imported);
      setDrafts({});
      setEditingKey(null);
      setView('standings');
      showToast('Liga restaurada desde el archivo.');
    } catch (err) {
      showToast(err.message || 'No se pudo leer el archivo.', 'error');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Borrar todo y volver al estado inicial? No se puede deshacer.')) return;
    setLeague(await resetLeague());
    setDrafts({});
    setEditingKey(null);
    setView('standings');
    showToast('Liga reiniciada.');
  };

  /* -------------------------------------------------------- compartir */

  const handleShareText = async () => {
    const text = formatStandingsForShare(standings, group, fechasJugadas, league.scoring);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Puntaco Pádel — ${group.name}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast('Tabla copiada. Pegala en el grupo.');
    } catch {
      showToast('No se pudo copiar la tabla.', 'error');
    }
  };

  const handleShareImage = async () => {
    try {
      const subtitle = `Acumulado de ${fechasJugadas} fecha${fechasJugadas === 1 ? '' : 's'}`;
      await downloadStandingsImage(standings, group, subtitle, league.scoring);
      showToast('Imagen descargada.');
    } catch {
      showToast('No se pudo generar la imagen.', 'error');
    }
  };

  /* ----------------------------------------------------------- render */

  const navItems = [
    { id: 'standings', label: 'Tabla', icon: BarChart3 },
    { id: 'fechas', label: 'Fechas', icon: Calendar },
    { id: 'admin', label: 'Liga', icon: Settings },
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

      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${theme.softBg} border ${theme.border}`}>
              🎾
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-white leading-tight truncate">Puntaco Pádel</h1>
              <p className="text-[11px] text-slate-500 leading-tight flex items-center gap-1">
                {fechasCompletas} de {group.fechas.length} fechas completas
                {syncing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-600" />}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cambiar de grupo no borra nada de lo que estés cargando */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {league.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGroupId(g.id);
                    setSelectedPlayerId(null);
                    if (view === 'load' || view === 'player') setView('standings');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    group.id === g.id ? `${themeFor(g.id).bg} text-slate-950` : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <AuthGate canEdit={canEdit} onSignIn={signIn} onSignOut={signOut} />
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-4 flex gap-1 border-t border-slate-800/60 py-1.5 overflow-x-auto pk-noscroll">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setSelectedPlayerId(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                view === id ? `bg-slate-800 ${theme.text}` : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
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

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {view === 'standings' && (
          <Standings
            standings={standings}
            group={group}
            scoring={league.scoring}
            fechasJugadas={fechasJugadas}
            onOpenPlayer={(playerId) => {
              setSelectedPlayerId(playerId);
              setView('player');
            }}
            onShareText={handleShareText}
            onShareImage={handleShareImage}
            onGoToFechas={() => setView('fechas')}
          />
        )}

        {view === 'fechas' && (
          <Fechas
            group={group}
            league={league}
            drafts={drafts}
            scoring={league.scoring}
            canEdit={canEdit}
            onOpenFecha={requireAuth(openFecha)}
            onDeleteFecha={requireAuth(handleDeleteResults)}
            onAddFecha={requireAuth(() => handleAddFecha(group.id))}
          />
        )}

        {view === 'load' && editing && editingGroup && (
          <LoadFecha
            group={editingGroup}
            otherGroup={league.groups.find((g) => g.id !== editingGroup.id)}
            fechaNum={editingFechaNum}
            fechaDate={editingGroup.fechas.find((f) => f.num === editingFechaNum)?.date || ''}
            draft={editing}
            scoring={league.scoring}
            onSlotChange={handleSlotChange}
            onGamesChange={handleGamesChange}
            onToggleTieBreak={handleToggleTieBreak}
            onLineupChange={handleLineupChange}
            onResetLineup={handleResetLineup}
            onSave={handleSaveFecha}
            onDiscard={handleDiscardDraft}
          />
        )}

        {view === 'load' && !editing && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-400">No hay ninguna fecha abierta.</p>
            <button
              onClick={() => setView('fechas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-slate-950 ${theme.bg}`}
            >
              Elegir una fecha
            </button>
          </div>
        )}

        {view === 'player' && (
          <PlayerProfile
            profile={profile}
            group={group}
            onBack={() => {
              setSelectedPlayerId(null);
              setView('standings');
            }}
          />
        )}

        {view === 'admin' && (
          <LeagueAdmin
            group={group}
            league={league}
            canEdit={canEdit}
            onAddPlayer={requireAuth(handleAddPlayer)}
            onUpdatePlayer={requireAuth(handleUpdatePlayer)}
            onDeletePlayer={requireAuth(handleDeletePlayer)}
            onUpdateFecha={requireAuth(handleUpdateFecha)}
            onAddFecha={requireAuth(handleAddFecha)}
            onDeleteFecha={requireAuth(handleDeleteCalendarFecha)}
            onUpdateScoring={requireAuth(handleUpdateScoring)}
            onExport={handleExport}
            onImport={requireAuth(handleImport)}
            onReset={requireAuth(handleReset)}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-2 text-[11px] text-slate-600">
          <Trophy className="w-3.5 h-3.5" />
          Puntaco Pádel ·{' '}
          {SUPABASE_CONFIGURED
            ? 'los datos se guardan en la nube, compartidos con todos'
            : 'modo local: los datos se guardan solo en este navegador'}
        </div>
      </footer>
    </div>
  );
}
