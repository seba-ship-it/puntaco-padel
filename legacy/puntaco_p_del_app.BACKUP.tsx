import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Award, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  BarChart3, 
  PlusCircle, 
  Info, 
  Sparkles,
  ShieldAlert,
  Flame,
  Check,
  RotateCcw,
  UserX,
  UserCheck,
  Edit3,
  ChevronRight
} from 'lucide-react';

// --- CALENDARIO OFICIAL PROGRAMADO (FECHAS 1 A 5 POR GRUPO) ---
const OFFICIAL_CALENDAR = {
  A: {
    1: { date: '24-ago', pairs: [ ['Tito', 'Faría'], ['Josexo', 'Willy'], ['LC', 'Joshua'], ['Juanba', 'Mauri'], ['Diego', 'Benja'] ] },
    2: { date: '31-ago', pairs: [ ['Tito', 'Benja'], ['Josexo', 'Faría'], ['LC', 'Willy'], ['Juanba', 'Joshua'], ['Diego', 'Mauri'] ] },
    3: { date: '7-sept', pairs: [ ['Tito', 'Mauri'], ['Josexo', 'Benja'], ['LC', 'Faría'], ['Juanba', 'Willy'], ['Diego', 'Joshua'] ] },
    4: { date: '14-sept', pairs: [ ['Tito', 'Joshua'], ['Josexo', 'Mauri'], ['LC', 'Benja'], ['Juanba', 'Faría'], ['Diego', 'Willy'] ] },
    5: { date: '21-sept', pairs: [ ['Tito', 'Willy'], ['Josexo', 'Joshua'], ['LC', 'Mauri'], ['Juanba', 'Benja'], ['Diego', 'Faría'] ] },
  },
  B: {
    1: { date: '24-ago', pairs: [ ['Sebas', 'Josué'], ['Ale', 'Jordan'], ['Gusta', 'Fideo'], ['Vinchi', 'Alejo'], ['José F', 'Juanki'] ] },
    2: { date: '31-ago', pairs: [ ['Sebas', 'Juanki'], ['Ale', 'Josué'], ['Gusta', 'Jordan'], ['Vinchi', 'Fideo'], ['José F', 'Alejo'] ] },
    3: { date: '7-sept', pairs: [ ['Sebas', 'Alejo'], ['Ale', 'Juanki'], ['Gusta', 'Josué'], ['Vinchi', 'Jordan'], ['José F', 'Fideo'] ] },
    4: { date: '14-sept', pairs: [ ['Sebas', 'Fideo'], ['Ale', 'Alejo'], ['Gusta', 'Juanki'], ['Vinchi', 'Josué'], ['José F', 'Jordan'] ] },
    5: { date: '21-sept', pairs: [ ['Sebas', 'Jordan'], ['Ale', 'Fideo'], ['Gusta', 'Alejo'], ['Vinchi', 'Juanki'], ['José F', 'Josué'] ] },
  }
};

// --- JUGADORES TITULARES REGISTRADOS POR GRUPO ---
const MAIN_PLAYERS = {
  A: [
    { name: 'Tito', role: 'Drive' },
    { name: 'Josexo', role: 'Drive' },
    { name: 'LC', role: 'Drive' },
    { name: 'Juanba', role: 'Drive' },
    { name: 'Diego', role: 'Drive' },
    { name: 'Faría', role: 'Revés' },
    { name: 'Willy', role: 'Revés' },
    { name: 'Joshua', role: 'Revés' },
    { name: 'Mauri', role: 'Revés' },
    { name: 'Benja', role: 'Revés' },
  ],
  B: [
    { name: 'Sebas', role: 'Drive' },
    { name: 'Ale', role: 'Drive' },
    { name: 'Gusta', role: 'Drive' },
    { name: 'Vinchi', role: 'Drive' },
    { name: 'José F', role: 'Drive' },
    { name: 'Josué', role: 'Revés' },
    { name: 'Jordan', role: 'Revés' },
    { name: 'Fideo', role: 'Revés' },
    { name: 'Alejo', role: 'Revés' },
    { name: 'Juanki', role: 'Revés' },
  ]
};

// Estilos de color para tarjetas de parejas
const COLOR_SCHEMES = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300' },
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('standings'); // standings | calendar | loadJornada | history
  const [selectedDivision, setSelectedDivision] = useState('A'); // A | B
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL | Drive | Revés

  // Guardado de jornadas jugadas
  const [savedJornadas, setSavedJornadas] = useState([]);

  // Estado para la jornada actual que se está cargando
  const [activeFechaNum, setActiveFechaNum] = useState(1);
  const [activePairs, setActivePairs] = useState([]);
  const [currentMatches, setCurrentMatches] = useState([]);
  const [notification, setNotification] = useState(null);

  // Mensaje emergente
  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Cargar matriz de partidos (10 partidos todos contra todos para 5 parejas)
  const generateMatchesList = () => {
    const list = [];
    let idCounter = 1;
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        list.push({
          id: `m_${idCounter}`,
          p1Idx: i,
          p2Idx: j,
          p1Games: '',
          p2Games: '',
          isTieBreak: false,
          winnerIdx: null
        });
        idCounter++;
      }
    }
    return list;
  };

  // Cargar parejas desde el calendario oficial para una fecha específica
  const handleLoadFechaFromCalendar = (div, fNum) => {
    setSelectedDivision(div);
    setActiveFechaNum(fNum);

    const fData = OFFICIAL_CALENDAR[div]?.[fNum];
    if (!fData) return;

    // Crear la estructura de parejas asignando si hay reemplazos
    const pairsConfig = fData.pairs.map((p, idx) => ({
      id: `P${idx + 1}`,
      name: `Pareja ${idx + 1}`,
      drive: p[0],
      originalDrive: p[0],
      isDriveSub: false,
      reves: p[1],
      originalReves: p[1],
      isRevesSub: false,
      color: COLOR_SCHEMES[idx]
    }));

    setActivePairs(pairsConfig);
    setCurrentMatches(generateMatchesList());
    setActiveTab('loadJornada');
    showToast(`Fecha ${fNum} (${fData.date}) lista para cargar en Grupo ${div}.`);
  };

  // Modificar jugador o marcar como Reemplazo
  const handleUpdatePairPlayer = (pairIdx, field, newName, isSub) => {
    setActivePairs(prev => prev.map((pair, idx) => {
      if (idx !== pairIdx) return pair;

      if (field === 'drive') {
        return {
          ...pair,
          drive: newName,
          isDriveSub: isSub !== undefined ? isSub : pair.isDriveSub
        };
      } else {
        return {
          ...pair,
          reves: newName,
          isRevesSub: isSub !== undefined ? isSub : pair.isRevesSub
        };
      }
    }));
  };

  // CÁLCULO DE LA TABLA DE POSICIONES
  const standings = useMemo(() => {
    const mainList = MAIN_PLAYERS[selectedDivision] || [];
    const groupJornadas = savedJornadas.filter(j => j.division === selectedDivision);

    const statsMap = new Map();
    mainList.forEach(p => {
      statsMap.set(p.name, {
        name: p.name,
        role: p.role,
        pj: 0,
        pg: 0,
        ppNormal: 0,
        ppTB: 0,
        extraBonus: 0,
        fechasPerfectas: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalPoints: 0
      });
    });

    groupJornadas.forEach(jornada => {
      const pairWins = Array(5).fill(0);
      const pairMatchesPlayed = Array(5).fill(0);

      jornada.matches.forEach(m => {
        if (m.winnerIdx === null || m.winnerIdx === undefined) return;

        const p1 = jornada.pairs[m.p1Idx];
        const p2 = jornada.pairs[m.p2Idx];
        if (!p1 || !p2) return;

        pairMatchesPlayed[m.p1Idx]++;
        pairMatchesPlayed[m.p2Idx]++;

        const isP1Winner = m.winnerIdx === 0;
        const winnerPair = isP1Winner ? p1 : p2;
        const loserPair = isP1Winner ? p2 : p1;

        const winnerIdx = isP1Winner ? m.p1Idx : m.p2Idx;
        pairWins[winnerIdx]++;

        const g1 = Number(m.p1Games) || 0;
        const g2 = Number(m.p2Games) || 0;
        const winnerGames = isP1Winner ? g1 : g2;
        const loserGames = isP1Winner ? g2 : g1;

        // Puntos Ganadores (+10 Pts c/u)
        // Solo se suma al jugador si NO era reemplazo o si está en la lista principal
        const winnerPlayers = [
          { name: winnerPair.drive, isSub: winnerPair.isDriveSub, orig: winnerPair.originalDrive },
          { name: winnerPair.reves, isSub: winnerPair.isRevesSub, orig: winnerPair.originalReves }
        ];

        winnerPlayers.forEach(pObj => {
          // Si el jugador titular no vino y hubo reemplazo, NO suma al titular
          if (!pObj.isSub && statsMap.has(pObj.name)) {
            const st = statsMap.get(pObj.name);
            st.pj += 1;
            st.pg += 1;
            st.totalPoints += 10;
            st.gamesWon += winnerGames;
            st.gamesLost += loserGames;
          } else if (pObj.isSub && statsMap.has(pObj.name)) {
            // Si el reemplazo es otro jugador registrado
            const st = statsMap.get(pObj.name);
            st.pj += 1;
            st.pg += 1;
            st.totalPoints += 10;
            st.gamesWon += winnerGames;
            st.gamesLost += loserGames;
          }
        });

        // Puntos Perdedores (+2 si fue Tie-Break, 0 normal)
        const loserPlayers = [
          { name: loserPair.drive, isSub: loserPair.isDriveSub, orig: loserPair.originalDrive },
          { name: loserPair.reves, isSub: loserPair.isRevesSub, orig: loserPair.originalReves }
        ];

        loserPlayers.forEach(pObj => {
          if (!pObj.isSub && statsMap.has(pObj.name)) {
            const st = statsMap.get(pObj.name);
            st.pj += 1;
            st.gamesWon += loserGames;
            st.gamesLost += winnerGames;

            if (m.isTieBreak) {
              st.ppTB += 1;
              st.totalPoints += 2;
            } else {
              st.ppNormal += 1;
            }
          } else if (pObj.isSub && statsMap.has(pObj.name)) {
            const st = statsMap.get(pObj.name);
            st.pj += 1;
            st.gamesWon += loserGames;
            st.gamesLost += winnerGames;

            if (m.isTieBreak) {
              st.ppTB += 1;
              st.totalPoints += 2;
            } else {
              st.ppNormal += 1;
            }
          }
        });
      });

      // Bonus Fecha Perfecta (+5 pts)
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        if (pairMatchesPlayed[pIdx] >= 4 && pairWins[pIdx] === 4) {
          const perfPair = jornada.pairs[pIdx];
          if (perfPair) {
            const perfPlayers = [
              { name: perfPair.drive, isSub: perfPair.isDriveSub },
              { name: perfPair.reves, isSub: perfPair.isRevesSub }
            ];

            perfPlayers.forEach(pObj => {
              if (!pObj.isSub && statsMap.has(pObj.name)) {
                const st = statsMap.get(pObj.name);
                st.extraBonus += 5;
                st.fechasPerfectas += 1;
                st.totalPoints += 5;
              }
            });
          }
        }
      }
    });

    let result = Array.from(statsMap.values());

    if (roleFilter !== 'ALL') {
      result = result.filter(p => p.role === roleFilter);
    }

    return result.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.pg !== a.pg) return b.pg - a.pg;
      return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
    });
  }, [savedJornadas, selectedDivision, roleFilter]);

  // Manejar cambios de resultado en los partidos
  const handleMatchChange = (matchId, field, value) => {
    setCurrentMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;

      const updated = { ...m, [field]: value };

      if (field === 'p1Games' || field === 'p2Games') {
        const g1 = Number(field === 'p1Games' ? value : updated.p1Games);
        const g2 = Number(field === 'p2Games' ? value : updated.p2Games);

        if ((g1 === 7 && g2 === 6) || (g1 === 6 && g2 === 7)) {
          updated.isTieBreak = true;
        }

        if (g1 > g2) updated.winnerIdx = 0;
        else if (g2 > g1) updated.winnerIdx = 1;
      }

      return updated;
    }));
  };

  // Guardar la fecha
  const handleSaveFecha = (e) => {
    e.preventDefault();

    const filledCount = currentMatches.filter(m => m.winnerIdx !== null).length;
    if (filledCount === 0) {
      showToast('Carga al menos un resultado de partido antes de guardar.', 'error');
      return;
    }

    const fDate = OFFICIAL_CALENDAR[selectedDivision]?.[activeFechaNum]?.date || '2026-08-24';

    const newJornada = {
      id: `j_${selectedDivision}_f${activeFechaNum}_${Date.now()}`,
      division: selectedDivision,
      fechaNum: Number(activeFechaNum),
      date: fDate,
      pairs: activePairs,
      matches: currentMatches
    };

    setSavedJornadas(prev => [
      ...prev.filter(j => !(j.division === selectedDivision && j.fechaNum === activeFechaNum)),
      newJornada
    ]);

    setActiveTab('standings');
    showToast(`¡Resultados de la Fecha ${activeFechaNum} del Grupo ${selectedDivision} guardados!`);
  };

  // Borrar historial
  const handleDeleteJornada = (id) => {
    setSavedJornadas(prev => prev.filter(j => j.id !== id));
    showToast('Fecha eliminada del registro.');
  };

  const isGrupoA = selectedDivision === 'A';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* TOAST FLOTANTE DE NOTIFICACIÓN */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border transition-all animate-bounce ${
          notification.type === 'error' 
            ? 'bg-rose-900/90 border-rose-500 text-rose-100' 
            : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
        }`}>
          {notification.type === 'error' ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* HEADER DE NAVEGACIÓN */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${
              isGrupoA 
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20' 
                : 'bg-gradient-to-tr from-pink-500 to-rose-400 text-slate-950 shadow-pink-500/20'
            }`}>
              🎾
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                PUNTACO <span className={isGrupoA ? "text-emerald-400" : "text-pink-400"}>PÁDEL</span>
              </h1>
              <p className="text-xs text-slate-400">Liga Oficial • Fechas 1 a 5</p>
            </div>
          </div>

          {/* SELECTOR DE GRUPOS (A / B) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setSelectedDivision('A'); handleLoadFechaFromCalendar('A', 1); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedDivision === 'A'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              GRUPO A (Verde)
            </button>
            <button
              onClick={() => { setSelectedDivision('B'); handleLoadFechaFromCalendar('B', 1); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedDivision === 'B'
                  ? 'bg-pink-500 text-slate-950 shadow-md shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              GRUPO B (Pink)
            </button>
          </div>
        </div>

        {/* MENÚ DE SECCIONES */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-2 border-t border-slate-800/60 py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'standings'
                ? isGrupoA ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-pink-400 border border-pink-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tabla de Posiciones
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'calendar'
                ? isGrupoA ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-pink-400 border border-pink-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendario Oficial (Fechas 1-5)
          </button>

          <button
            onClick={() => {
              if (activePairs.length === 0) handleLoadFechaFromCalendar(selectedDivision, 1);
              setActiveTab('loadJornada');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'loadJornada'
                ? isGrupoA ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-pink-400 border border-pink-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Cargar Fecha / Marcadores
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? isGrupoA ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-pink-400 border border-pink-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Fechas Guardadas
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TARJETA INFORMATIVA DEL REGLAMENTO */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${
            isGrupoA ? "text-emerald-400" : "text-pink-400"
          }`}>
            <Info className="w-4 h-4" />
            Reglas de Puntuación & Reemplazos
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Victoria:</span>
              <span className="text-emerald-400 font-black text-sm">+10 Pts c/u</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Derrota Tie-Break:</span>
              <span className="text-amber-400 font-black text-sm">+2 Pts c/u</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Fecha Perfecta (4/4):</span>
              <span className={isGrupoA ? "text-emerald-400 font-black text-sm" : "text-pink-400 font-black text-sm"}>
                +5 Pts Bonus
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Ausentes / Reemplazos:</span>
              <span className="text-rose-400 font-bold text-xs">El ausente suma 0 Pts</span>
            </div>
          </div>
        </div>

        {/* TAB 1: TABLA DE POSICIONES */}
        {activeTab === 'standings' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Clasificación Acumulada - <span className={isGrupoA ? "text-emerald-400" : "text-pink-400"}>
                    GRUPO {selectedDivision}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Puntaje individual de los jugadores en la temporada</p>
              </div>

              {/* FILTROS POR POSICIÓN */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    roleFilter === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  General (Todos)
                </button>
                <button
                  onClick={() => setRoleFilter('Drive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    roleFilter === 'Drive' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tabla DRIVE 🛡️
                </button>
                <button
                  onClick={() => setRoleFilter('Revés')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    roleFilter === 'Revés' ? 'bg-purple-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tabla REVÉS ⚔️
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-center w-12">Pos</th>
                      <th className="py-3.5 px-4 font-bold">Jugador</th>
                      <th className="py-3.5 px-3 font-bold text-center">Rol</th>
                      <th className="py-3.5 px-3 font-bold text-center">PJ</th>
                      <th className="py-3.5 px-3 font-bold text-center text-emerald-400">PG (+10)</th>
                      <th className="py-3.5 px-3 font-bold text-center text-slate-400">PP (0)</th>
                      <th className="py-3.5 px-3 font-bold text-center text-amber-400">PP-TB (+2)</th>
                      <th className="py-3.5 px-3 font-bold text-center text-purple-400">Ex (+5)</th>
                      <th className="py-3.5 px-3 font-bold text-center text-slate-300">G+ / G-</th>
                      <th className="py-3.5 px-3 font-bold text-center text-slate-300">Dif G</th>
                      <th className={`py-3.5 px-4 font-bold text-center ${isGrupoA ? "text-emerald-400" : "text-pink-400"}`}>
                        PTS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {standings.map((player, idx) => {
                      const isFirst = idx === 0;
                      const isSecond = idx === 1;
                      const isThird = idx === 2;
                      const difGames = player.gamesWon - player.gamesLost;

                      return (
                        <tr key={player.name} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-center font-black">
                            {isFirst && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">1</span>}
                            {isSecond && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30">2</span>}
                            {isThird && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30">3</span>}
                            {!isFirst && !isSecond && !isThird && <span className="text-slate-500">{idx + 1}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              👤 {player.name}
                              {player.fechasPerfectas > 0 && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                  <Flame className="w-3 h-3 fill-amber-400" />
                                  {player.fechasPerfectas} Fecha Perfecta
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                              player.role === 'Drive' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            }`}>
                              {player.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-slate-300">{player.pj}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-400">{player.pg}</td>
                          <td className="py-3.5 px-3 text-center font-medium text-slate-400">{player.ppNormal}</td>
                          <td className="py-3.5 px-3 text-center font-semibold text-amber-400">
                            {player.ppTB > 0 ? `+${player.ppTB * 2} (${player.ppTB})` : '0'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-purple-400">
                            {player.extraBonus > 0 ? `+${player.extraBonus}` : '0'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-400">
                            {player.gamesWon} / {player.gamesLost}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-bold text-xs ${
                            difGames > 0 ? 'text-emerald-400' : difGames < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {difGames > 0 ? `+${difGames}` : difGames}
                          </td>
                          <td className={`py-3.5 px-4 text-center font-black text-base ${
                            isGrupoA ? "text-emerald-400" : "text-pink-400"
                          }`}>
                            {player.totalPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALENDARIO OFICIAL (FECHAS 1 A 5) */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Calendario Oficial de Parejas - <span className={isGrupoA ? "text-emerald-400" : "text-pink-400"}>
                  GRUPO {selectedDivision}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Formaciones fijadas para las Fechas 1 a 5</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5].map((fNum) => {
                const fData = OFFICIAL_CALENDAR[selectedDivision]?.[fNum];
                if (!fData) return null;

                const isSaved = savedJornadas.some(j => j.division === selectedDivision && j.fechaNum === fNum);

                return (
                  <div key={fNum} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                    <div className={`p-4 border-b flex justify-between items-center ${
                      isGrupoA ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                    }`}>
                      <div>
                        <span className="font-black text-base block">FECHA {fNum}</span>
                        <span className="text-xs font-semibold text-slate-400">🗓️ {fData.date}</span>
                      </div>
                      {isSaved ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Registrada
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 bg-slate-950/40">
                      {fData.pairs.map((p, pIdx) => (
                        <div key={pIdx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold w-16">Pareja {pIdx + 1}</span>
                          <div className="flex items-center space-x-2 font-bold text-slate-200">
                            <span className="text-blue-300">{p[0]}</span>
                            <span className="text-slate-600">+</span>
                            <span className="text-purple-300">{p[1]}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800">
                      <button
                        onClick={() => handleLoadFechaFromCalendar(selectedDivision, fNum)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          isGrupoA ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md' : 'bg-pink-500 hover:bg-pink-400 text-slate-950 shadow-md'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        Cargar Resultados Fecha {fNum}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CARGAR RESULTADOS DE FECHA Y REEMPLAZOS */}
        {activeTab === 'loadJornada' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    Cargar Resultados - <span className={isGrupoA ? "text-emerald-400" : "text-pink-400"}>
                      GRUPO {selectedDivision} (Fecha {activeFechaNum})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Ingresa los marcadores y modifica si hubo reemplazos</p>
                </div>

                {/* SELECTOR DE FECHAS 1 A 5 */}
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(fNum => (
                    <button
                      key={fNum}
                      onClick={() => handleLoadFechaFromCalendar(selectedDivision, fNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeFechaNum === fNum
                          ? isGrupoA ? 'bg-emerald-500 text-slate-950' : 'bg-pink-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      F{fNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECCIÓN DE AJUSTE DE PAREJAS / REEMPLAZOS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Parejas de la Fecha {activeFechaNum} (Puedes cambiar nombres por reemplazo):
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    * Al marcar reemplazo, el ausente NO suma puntos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {activePairs.map((pair, pIdx) => {
                    const st = pair.color;
                    return (
                      <div key={pIdx} className={`p-3 rounded-xl border ${st.bg} ${st.border} space-y-2`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-black text-slate-400">Pareja {pIdx + 1}</span>
                        </div>

                        {/* Drive Player */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-blue-300 font-bold block">Drive:</label>
                          <input
                            type="text"
                            value={pair.drive}
                            onChange={(e) => handleUpdatePairPlayer(pIdx, 'drive', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                          />
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pair.isDriveSub}
                              onChange={(e) => handleUpdatePairPlayer(pIdx, 'drive', pair.drive, e.target.checked)}
                              className="rounded border-slate-800 bg-slate-900 text-rose-500 text-[10px]"
                            />
                            <span className="text-[9px] text-rose-400 font-bold">¿Es Reemplazo?</span>
                          </label>
                        </div>

                        {/* Revés Player */}
                        <div className="space-y-1 pt-1 border-t border-slate-800/60">
                          <label className="text-[10px] text-purple-300 font-bold block">Revés:</label>
                          <input
                            type="text"
                            value={pair.reves}
                            onChange={(e) => handleUpdatePairPlayer(pIdx, 'reves', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                          />
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pair.isRevesSub}
                              onChange={(e) => handleUpdatePairPlayer(pIdx, 'reves', pair.reves, e.target.checked)}
                              className="rounded border-slate-800 bg-slate-900 text-rose-500 text-[10px]"
                            />
                            <span className="text-[9px] text-rose-400 font-bold">¿Es Reemplazo?</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LISTADO DE LOS 10 PARTIDOS */}
              <form onSubmit={handleSaveFecha} className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Resultados de los 10 Partidos de la Fecha
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {currentMatches.map((match, mIdx) => {
                    const p1 = activePairs[match.p1Idx];
                    const p2 = activePairs[match.p2Idx];
                    const st1 = p1?.color || COLOR_SCHEMES[0];
                    const st2 = p2?.color || COLOR_SCHEMES[1];

                    return (
                      <div key={match.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-500 flex justify-between items-center">
                          <span>Partido #{mIdx + 1}</span>
                          {match.isTieBreak && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              ⚡ Tie-Break (+2 pts al perdedor)
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          
                          {/* PAREJA 1 */}
                          <div className="md:col-span-4">
                            <button
                              type="button"
                              onClick={() => handleMatchChange(match.id, 'winnerIdx', 0)}
                              className={`w-full p-3 rounded-xl border text-left transition-all ${
                                match.winnerIdx === 0
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                                  : `${st1.bg} ${st1.border} text-slate-300 hover:border-slate-700`
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold text-slate-400">Pareja {match.p1Idx + 1}</div>
                              <div className="font-bold text-xs text-white">
                                {p1?.drive} {p1?.isDriveSub && '(R)'} / {p1?.reves} {p1?.isRevesSub && '(R)'}
                              </div>
                            </button>
                          </div>

                          <div className="md:col-span-1 text-center text-xs font-black text-slate-600">VS</div>

                          {/* PAREJA 2 */}
                          <div className="md:col-span-4">
                            <button
                              type="button"
                              onClick={() => handleMatchChange(match.id, 'winnerIdx', 1)}
                              className={`w-full p-3 rounded-xl border text-left transition-all ${
                                match.winnerIdx === 1
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                                  : `${st2.bg} ${st2.border} text-slate-300 hover:border-slate-700`
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold text-slate-400">Pareja {match.p2Idx + 1}</div>
                              <div className="font-bold text-xs text-white">
                                {p2?.drive} {p2?.isDriveSub && '(R)'} / {p2?.reves} {p2?.isRevesSub && '(R)'}
                              </div>
                            </button>
                          </div>

                          {/* INGRESO DE GAMES */}
                          <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                            <div className="flex items-center space-x-2 justify-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="P1"
                                value={match.p1Games}
                                onChange={(e) => handleMatchChange(match.id, 'p1Games', e.target.value)}
                                className="w-12 bg-slate-900 border border-slate-800 rounded-lg py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                              />
                              <span className="text-slate-600 text-xs font-bold">-</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="P2"
                                value={match.p2Games}
                                onChange={(e) => handleMatchChange(match.id, 'p2Games', e.target.value)}
                                className="w-12 bg-slate-900 border border-slate-800 rounded-lg py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-lime-500"
                              />
                            </div>

                            <label className="flex items-center justify-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={match.isTieBreak}
                                onChange={(e) => handleMatchChange(match.id, 'isTieBreak', e.target.checked)}
                                className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0"
                              />
                              <span className="text-[11px] text-amber-400 font-medium">¿Derrota TB (+2 pts)?</span>
                            </label>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className={`px-6 py-3 rounded-xl font-black text-sm text-slate-950 flex items-center gap-2 shadow-lg transition-all ${
                      isGrupoA ? "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20" : "bg-pink-400 hover:bg-pink-300 shadow-pink-500/20"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar Fecha {activeFechaNum} y Calcular Tabla
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* TAB 4: FECHAS GUARDADAS */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Fechas Guardadas - <span className={isGrupoA ? "text-emerald-400" : "text-pink-400"}>
                  GRUPO {selectedDivision}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Historial de partidos y resultados registrados</p>
            </div>

            {savedJornadas.filter(j => j.division === selectedDivision).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
                No hay fechas cargadas aún para el Grupo {selectedDivision}.
              </div>
            ) : (
              savedJornadas.filter(j => j.division === selectedDivision).map((jornada) => (
                <div key={jornada.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`font-black text-xs px-3 py-1 rounded-lg border ${
                        isGrupoA ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-pink-500/10 text-pink-400 border-pink-500/20"
                      }`}>
                        Fecha #{jornada.fechaNum}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">📅 {jornada.date}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteJornada(jornada.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg transition-colors"
                      title="Eliminar Fecha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {jornada.matches.map((m, idx) => {
                      const p1 = jornada.pairs[m.p1Idx];
                      const p2 = jornada.pairs[m.p2Idx];
                      const isP1Winner = m.winnerIdx === 0;

                      return (
                        <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className={isP1Winner ? 'font-bold text-emerald-400' : 'text-slate-400'}>
                              {p1?.drive} / {p1?.reves} {isP1Winner && '🏆 (+10)'}
                            </div>
                            <div className={!isP1Winner ? 'font-bold text-emerald-400' : 'text-slate-400'}>
                              {p2?.drive} / {p2?.reves} {!isP1Winner && '🏆 (+10)'}
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            {m.isTieBreak && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 block">
                                Tie-Break (+2 pts)
                              </span>
                            )}
                            <div className="font-mono text-slate-300 font-bold">
                              {m.p1Games} - {m.p2Games}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          Puntaco Pádel • Control de Posiciones y Reemplazos (Win +10 | TB +2 | Bonus +5)
        </div>
      </footer>
    </div>
  );
}