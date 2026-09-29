import React from 'react';
import { SectionTitle } from '../components/ui.jsx';

const gs = (n) => `${Number(n).toLocaleString('es-PY')} Gs.`;

/** Reglamento Puntako Pádel 2026, resumido. Los puntajes salen de la configuración real. */
export default function Reglamento({ scoring, fees }) {
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

  const sections = [
    {
      title: 'Puntaje',
      rows: [
        ['Partido ganado', `+${scoring.victoria}`],
        ['Partido perdido', `${scoring.derrotaNormal}`],
        ['Victoria 6-0 (extra)', sign(scoring.bonus60)],
        ['Derrota 0-6', sign(-scoring.penalizacion06)],
        ['Derrota 7-6', `${scoring.derrotaTieBreak}`],
        ['Derrota 7-5', `${scoring.derrota75}`],
        ['Jornada perfecta (4/4 ganados)', sign(scoring.fechaPerfecta)],
      ],
      note: 'Los extras (6-0, derrotas 7-6 y 7-5, jornada perfecta) no aplican al jugar con invitado ni en partidos no anotados en la pizarra.',
    },
    {
      title: 'Jugadores de apoyo',
      rows: [
        ['Entrar a jugar y perder', sign(scoring.apoyoDerrota)],
        ['Ganar un partido', sign(scoring.apoyoVictoria)],
        ['Ganar 6-0 (extra)', sign(scoring.apoyoVictoria60)],
        ['Perder 7-6 (extra)', sign(scoring.apoyoDerrotaTieBreak)],
        ['Perder 0-6 (extra)', sign(scoring.apoyoDerrota06)],
      ],
      note: 'Los extras se suman al puntaje base del apoyo. Medida de último recurso: primero se buscan invitados externos. El drive reemplaza solo a drive y el revés solo a revés, del mismo grupo, y máximo 1 partido de apoyo por jugador por lunes.',
    },
    {
      title: 'Ascensos y descensos (al terminar la Fecha 5)',
      list: [
        'Descenso directo: el último posicionado de cada puesto (Drive y Revés) del Grupo A.',
        'Ascenso directo: el primer posicionado de cada puesto del Grupo B.',
        'Repechaje: penúltimo del Grupo A vs. 2º del Grupo B, partido americanito con la pareja completa, en la Fecha 1 de la temporada siguiente.',
        'Recuperatorio: por ausencia justificable por torneo externo, 1 cada 5 fechas; recupera el 50% de los puntos ganados en la fecha siguiente (sin extras).',
      ],
    },
    {
      title: 'Fechas y partidos',
      list: [
        'Se juega los lunes, de 19:00 a 22:00 hs. Tolerancia máxima hasta las 20:00 hs.',
        '4 partidos por fecha para cada jugador. Partidos a 6 games, tie-break a 7 puntos en 6-6 y punto de oro.',
        'Ausencias: avisar hasta el lunes a las 12:00 hs del mediodía. Asistencia mínima: 60% (6 de 10 fechas) por torneo.',
        'Desempates de la tabla: puntos → partidos ganados → diferencia de games → games ganados.',
      ],
    },
    {
      title: 'Cuotas y multas',
      rows: [
        ['Cuota del fijo (180.000 alquiler + 20.000 pozo)', gs(fees.cuotaFijo)],
        ['Invitado por jornada (paga quien lo invita)', gs(fees.invitadoJornada)],
        ['Pareja que pierde 6-0 (cada uno)', gs(fees.multa60)],
        ['Doble falta (por jugador)', gs(fees.dobleFalta)],
      ],
      note: 'El pago del fijo no debe pasar de la 2ª fecha. Pasado 1 mes sin pagar al invitado, se congelan los puntos de la jornada hasta saldar la deuda.',
    },
    {
      title: 'Campeones',
      list: [
        'Tras 10 fechas: campeón el Drive con mayor puntaje y el Revés con mayor puntaje.',
        'Premio: fijo gratis (inscripción 100% bonificada del torneo siguiente) y trofeo oficial.',
      ],
    },
  ];

  return (
    <div className="space-y-4 pk-fade">
      <SectionTitle title="Reglamento" subtitle="Puntako Pádel 2026 · resumen de las reglas vigentes" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sections.map((sec) => (
          <section key={sec.title} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-black text-white">{sec.title}</h3>
            {sec.rows && (
              <div className="divide-y divide-slate-800">
                {sec.rows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-bold text-white tabular-nums whitespace-nowrap">{value}</span>
                  </div>
                ))}
              </div>
            )}
            {sec.list && (
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 marker:text-slate-600">
                {sec.list.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {sec.note && <p className="text-[11px] text-slate-500 leading-relaxed">{sec.note}</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
