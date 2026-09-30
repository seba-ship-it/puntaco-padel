/**
 * Imágenes para compartir: la tabla, el resumen de una jornada y la tabla
 * final de una temporada. Se dibujan a mano en un canvas (sin librerías de
 * captura) para que salgan siempre iguales, sin depender de cómo se ve la
 * pantalla, y se bajan como PNG.
 */

import { formatDate } from '../data/defaults.js';
import { triggerDownload } from './storage.js';

const C = {
  bg: '#020617',
  card: '#0f172a',
  cardAlt: '#111c33',
  line: '#1e293b',
  title: '#ffffff',
  muted: '#64748b',
  text: '#e2e8f0',
  gold: '#fbbf24',
  silver: '#cbd5e1',
  bronze: '#b45309',
  win: '#34d399',
  loss: '#94a3b8',
  warn: '#fbbf24',
  bad: '#fb7185',
  drive: '#93c5fd',
  reves: '#d8b4fe',
};

const GROUP_ACCENT = { A: '#34d399', B: '#f472b6' };
const ROLE_LABEL = { Drive: 'DRIVE', Revés: 'REVÉS' };
const ROLE_COLOR = { Drive: C.drive, Revés: C.reves };
const W = 900;
const PAD = 40;

const font = (size, weight = '400') =>
  `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

/* ---------------------------------------------------------------- utilidades */

function makeCanvas(height, accent) {
  const dpr = 2; // el doble de resolución, para que se vea nítido en el celular
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

function header(ctx, accent, groupName, subtitle) {
  ctx.textAlign = 'left';
  ctx.fillStyle = C.title;
  ctx.font = font(38, '800');
  ctx.fillText('🎾 PUNTAKO PÁDEL', PAD, 72);
  ctx.fillStyle = accent;
  ctx.font = font(24, '700');
  ctx.fillText(groupName.toUpperCase(), PAD, 108);
  ctx.fillStyle = C.muted;
  ctx.font = font(16, '400');
  ctx.fillText(subtitle, PAD, 134);
}

/** Achica el texto hasta que entre en `maxWidth`. */
function fitText(ctx, text, maxWidth, size, weight) {
  let s = size;
  ctx.font = font(s, weight);
  while (ctx.measureText(text).width > maxWidth && s > 11) {
    s -= 1;
    ctx.font = font(s, weight);
  }
  return s;
}

function footer(ctx, y, text) {
  ctx.textAlign = 'left';
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = font(14, '500');
  ctx.fillText(text, PAD, y + 28);
}

const rulesLine = (scoring) =>
  `Victoria +${scoring.victoria}  ·  Derrota 7-6 +${scoring.derrotaTieBreak}  ·  7-5 +${scoring.derrota75}  ·  Fecha perfecta +${scoring.fechaPerfecta}  ·  Apoyo +${scoring.apoyoDerrota}/+${scoring.apoyoVictoria}`;

function finish(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen.'));
        return;
      }
      triggerDownload(blob, filename);
      resolve(filename);
    }, 'image/png');
  });
}

const slugName = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* --------------------------------------------------------------------- tabla */

const TABLE_ROW_H = 58;
const TABLE_SECTION_H = 52;

/**
 * Tabla separada por puesto (Drive y Revés), como el ranking oficial.
 * Sirve tanto para la tabla actual como para la final de una temporada.
 *
 * @param rows  filas con name, role, pj, pg, gamesWon, gamesLost, points (ya ordenadas)
 */
function renderStandings({ rows, groupId, groupName, subtitle, footerText, filename }) {
  const accent = GROUP_ACCENT[groupId] || '#34d399';
  const roles = ['Drive', 'Revés'].filter((r) => rows.some((p) => p.role === r));
  const bodyH = roles.reduce((h, r) => h + TABLE_SECTION_H + rows.filter((p) => p.role === r).length * TABLE_ROW_H + 14, 0);
  const H = 150 + bodyH + 70;

  const { canvas, ctx } = makeCanvas(H, accent);
  header(ctx, accent, groupName, subtitle);

  const colPts = W - PAD - 14;
  const colDif = colPts - 100;
  const colPg = colDif - 80;
  const colPj = colPg - 80;

  let y = 158;
  roles.forEach((role) => {
    const list = rows.filter((p) => p.role === role);

    // Título de la sección + encabezado de columnas
    ctx.textAlign = 'left';
    ctx.fillStyle = ROLE_COLOR[role];
    ctx.font = font(20, '800');
    ctx.fillText(ROLE_LABEL[role], PAD, y + 26);
    ctx.fillStyle = C.muted;
    ctx.font = font(13, '700');
    ctx.textAlign = 'right';
    ctx.fillText('PJ', colPj, y + 26);
    ctx.fillText('PG', colPg, y + 26);
    ctx.fillText('DIF', colDif, y + 26);
    ctx.fillText('PTS', colPts, y + 26);
    y += TABLE_SECTION_H - 6;

    list.forEach((p, i) => {
      ctx.fillStyle = i % 2 === 0 ? C.card : C.cardAlt;
      roundRect(ctx, PAD, y + 3, W - PAD * 2, TABLE_ROW_H - 6, 12);
      ctx.fill();

      const cy = y + TABLE_ROW_H / 2;
      const medal = i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : null;
      const cx = PAD + 30;
      if (medal) {
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fillStyle = medal + '33';
        ctx.fill();
        ctx.fillStyle = medal;
      } else {
        ctx.fillStyle = C.muted;
      }
      ctx.font = font(16, '800');
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cx, cy + 6);

      ctx.textAlign = 'left';
      ctx.fillStyle = C.title;
      const size = fitText(ctx, p.name, colPj - 70 - (PAD + 62), 21, '700');
      ctx.font = font(size, '700');
      ctx.fillText(p.name, PAD + 62, cy + 7);
      if (p.fechasPerfectas > 0) {
        const w = ctx.measureText(p.name).width;
        ctx.font = font(15, '400');
        ctx.fillText('🔥'.repeat(Math.min(p.fechasPerfectas, 3)), PAD + 72 + w, cy + 6);
      }

      const dif = (p.gamesWon || 0) - (p.gamesLost || 0);
      ctx.textAlign = 'right';
      ctx.fillStyle = C.text;
      ctx.font = font(18, '500');
      ctx.fillText(String(p.pj), colPj, cy + 6);
      ctx.fillStyle = C.win;
      ctx.font = font(18, '700');
      ctx.fillText(String(p.pg), colPg, cy + 6);
      ctx.fillStyle = dif > 0 ? C.win : dif < 0 ? C.bad : C.muted;
      ctx.font = font(18, '600');
      ctx.fillText(dif > 0 ? `+${dif}` : String(dif), colDif, cy + 6);
      ctx.fillStyle = accent;
      ctx.font = font(25, '800');
      ctx.fillText(String(p.points), colPts, cy + 8);
      y += TABLE_ROW_H;
    });
    y += 14;
  });

  footer(ctx, H - 52, footerText);
  return finish(canvas, filename);
}

/** Tabla actual de un grupo. */
export function downloadStandingsImage(rows, group, subtitle, scoring) {
  return renderStandings({
    rows,
    groupId: group.id,
    groupName: group.name,
    subtitle,
    footerText: rulesLine(scoring),
    filename: `puntako-tabla-${slugName(group.name)}-${today()}.png`,
  });
}

/** Tabla final de una temporada ya cerrada (una foto guardada en el historial). */
export function downloadSeasonImage(season, groupId) {
  const group = season.groups.find((g) => g.id === groupId);
  const dates = season.dates || [];
  const champ = season.champions?.[groupId];
  const range = dates.length ? `${formatDate(dates[0])} al ${formatDate(dates[dates.length - 1])}` : '';
  return renderStandings({
    rows: season.standings?.[groupId] || [],
    groupId,
    groupName: `${group?.name || `Grupo ${groupId}`} · Temporada ${season.number}`,
    subtitle: `Tabla final · ${range}`,
    footerText: champ
      ? `Campeones: ${champ.Drive?.name || '—'} (Drive) y ${champ['Revés']?.name || '—'} (Revés)`
      : 'Tabla final de la temporada',
    filename: `puntako-temporada-${season.number}-${slugName(group?.name || groupId)}.png`,
  });
}

/* ------------------------------------------------------------------- jornada */

const MATCH_ROW_H = 70;
const PLAYER_ROW_H = 42;

/**
 * Resumen de una jornada: los partidos con su marcador y cuánto sumó cada
 * jugador en esa fecha. `summary` sale de buildFechaSummary.
 */
export function downloadFechaImage(summary, scoring) {
  const { group, fechaNum, date, matches, rows } = summary;
  const accent = GROUP_ACCENT[group.id] || '#34d399';
  const H = 150 + 44 + matches.length * MATCH_ROW_H + 56 + 34 + rows.length * PLAYER_ROW_H + 80;

  const { canvas, ctx } = makeCanvas(H, accent);
  header(
    ctx,
    accent,
    `${group.name} · Fecha ${fechaNum}`,
    `${formatDate(date)} · Resumen de la jornada${summary.complete ? '' : ` (${matches.length} de 10 partidos)`}`,
  );

  // ---- Partidos
  let y = 160;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(13, '700');
  ctx.fillText('PARTIDOS', PAD, y + 14);
  y += 30;

  const SIDE_W = 330;
  const mid = W / 2;
  matches.forEach((m, i) => {
    ctx.fillStyle = i % 2 === 0 ? C.card : C.cardAlt;
    roundRect(ctx, PAD, y + 3, W - PAD * 2, MATCH_ROW_H - 6, 12);
    ctx.fill();

    const drawSide = (names, x, align, won) => {
      ctx.textAlign = align;
      names.forEach((n, k) => {
        ctx.fillStyle = won ? C.title : C.loss;
        fitText(ctx, n, SIDE_W, 18, won ? '700' : '500');
        ctx.fillText(n, x, y + 28 + k * 24);
      });
    };
    drawSide(m.pair1, PAD + 18, 'left', m.winnerIdx === 0);
    drawSide(m.pair2, W - PAD - 18, 'right', m.winnerIdx === 1);

    // Marcador
    ctx.textAlign = 'center';
    ctx.font = font(30, '800');
    ctx.fillStyle = m.winnerIdx === 0 ? C.win : C.loss;
    ctx.fillText(String(m.g1), mid - 34, y + 46);
    ctx.fillStyle = C.muted;
    ctx.font = font(24, '600');
    ctx.fillText('-', mid, y + 44);
    ctx.font = font(30, '800');
    ctx.fillStyle = m.winnerIdx === 1 ? C.win : C.loss;
    ctx.fillText(String(m.g2), mid + 34, y + 46);
    if (m.isTieBreak) {
      ctx.fillStyle = C.warn;
      ctx.font = font(11, '800');
      ctx.fillText('TIE-BREAK', mid, y + 62);
    }
    y += MATCH_ROW_H;
  });

  // ---- Puntos de cada jugador en la jornada
  y += 22;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(13, '700');
  ctx.fillText('PUNTOS DE LA JORNADA', PAD, y + 14);
  ctx.textAlign = 'right';
  ctx.fillText('PG/PJ', W - PAD - 130, y + 14);
  ctx.fillText('PTS', W - PAD - 14, y + 14);
  y += 28;

  rows.forEach((p, i) => {
    ctx.fillStyle = i % 2 === 0 ? C.card : C.cardAlt;
    roundRect(ctx, PAD, y + 2, W - PAD * 2, PLAYER_ROW_H - 4, 10);
    ctx.fill();
    const cy = y + PLAYER_ROW_H / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font = font(15, '700');
    ctx.fillText(String(i + 1), PAD + 16, cy + 5);

    ctx.fillStyle = C.title;
    const size = fitText(ctx, p.name, 330, 19, '700');
    ctx.font = font(size, '700');
    ctx.fillText(p.name, PAD + 46, cy + 6);
    let x = PAD + 56 + ctx.measureText(p.name).width;
    ctx.font = font(12, '700');
    ctx.fillStyle = ROLE_COLOR[p.role] || C.muted;
    ctx.fillText(p.role.toUpperCase(), x, cy + 5);
    x += ctx.measureText(p.role.toUpperCase()).width + 10;
    if (p.apoyoMatches > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('APOYO', x, cy + 5);
      x += ctx.measureText('APOYO').width + 10;
    }
    if (p.fechasPerfectas > 0) {
      ctx.font = font(15, '400');
      ctx.fillText('🔥 Fecha perfecta', x, cy + 5);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = C.text;
    ctx.font = font(17, '600');
    ctx.fillText(`${p.pg}/${p.pj}`, W - PAD - 130, cy + 6);
    ctx.fillStyle = p.points < 0 ? C.bad : accent;
    ctx.font = font(23, '800');
    ctx.fillText(p.points > 0 ? `+${p.points}` : String(p.points), W - PAD - 14, cy + 8);
    y += PLAYER_ROW_H;
  });

  footer(ctx, H - 52, rulesLine(scoring));
  return finish(canvas, `puntako-fecha-${fechaNum}-${slugName(group.name)}.png`);
}
