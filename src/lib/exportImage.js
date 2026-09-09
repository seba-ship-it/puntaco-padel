/**
 * Dibuja la tabla de posiciones en un canvas y la baja como PNG.
 *
 * Se dibuja a mano en vez de usar una librería de captura para que la imagen
 * salga siempre igual, no dependa de cómo se ve la pantalla y no sume peso.
 */

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
};

const GROUP_ACCENT = { A: '#34d399', B: '#f472b6' };

/**
 * @param rows      filas ya ordenadas de computeStandings
 * @param group     grupo (para el título y el color)
 * @param subtitle  ej. "Acumulado de 3 fechas"
 * @param scoring   reglamento, para el pie
 */
export function downloadStandingsImage(rows, group, subtitle, scoring) {
  const accent = GROUP_ACCENT[group.id] || '#34d399';

  const W = 900;
  const PAD = 40;
  const HEADER_H = 150;
  const ROW_H = 62;
  const FOOTER_H = 78;
  const H = HEADER_H + rows.length * ROW_H + FOOTER_H;

  const dpr = 2; // el doble de resolución, para que se vea nítido en el celular
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const font = (size, weight = '400') =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  // Fondo
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Barra de acento arriba
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);

  // Título
  ctx.fillStyle = C.title;
  ctx.font = font(38, '800');
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🎾 PUNTACO PÁDEL', PAD, 72);

  ctx.fillStyle = accent;
  ctx.font = font(24, '700');
  ctx.fillText(group.name.toUpperCase(), PAD, 108);

  ctx.fillStyle = C.muted;
  ctx.font = font(16, '400');
  ctx.fillText(subtitle, PAD, 134);

  // Encabezado de columnas
  const colPts = W - PAD;
  const colPg = W - PAD - 110;
  const colPj = W - PAD - 190;

  ctx.fillStyle = C.muted;
  ctx.font = font(13, '700');
  ctx.textAlign = 'right';
  ctx.fillText('PJ', colPj, HEADER_H - 12);
  ctx.fillText('PG', colPg, HEADER_H - 12);
  ctx.fillText('PTS', colPts, HEADER_H - 12);
  ctx.textAlign = 'left';

  // Filas
  rows.forEach((p, i) => {
    const y = HEADER_H + i * ROW_H;

    ctx.fillStyle = i % 2 === 0 ? C.card : C.cardAlt;
    roundRect(ctx, PAD, y + 4, W - PAD * 2, ROW_H - 8, 12);
    ctx.fill();

    // Posición
    const medal = i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : null;
    const cx = PAD + 30;
    const cy = y + ROW_H / 2;
    if (medal) {
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fillStyle = medal + '33';
      ctx.fill();
      ctx.fillStyle = medal;
    } else {
      ctx.fillStyle = C.muted;
    }
    ctx.font = font(17, '800');
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), cx, cy + 6);

    // Nombre
    ctx.textAlign = 'left';
    ctx.fillStyle = C.title;
    ctx.font = font(21, '700');
    let nameX = PAD + 62;
    ctx.fillText(p.name, nameX, cy + 1);
    nameX += ctx.measureText(p.name).width + 10;

    if (p.fechasPerfectas > 0) {
      ctx.font = font(15, '400');
      ctx.fillText('🔥'.repeat(Math.min(p.fechasPerfectas, 3)), nameX, cy + 1);
    }

    // Rol
    ctx.fillStyle = C.muted;
    ctx.font = font(13, '500');
    ctx.fillText(p.role, PAD + 62, cy + 20);

    // Números
    ctx.textAlign = 'right';
    ctx.fillStyle = C.text;
    ctx.font = font(18, '500');
    ctx.fillText(String(p.pj), colPj, cy + 6);
    ctx.fillStyle = '#34d399';
    ctx.font = font(18, '700');
    ctx.fillText(String(p.pg), colPg, cy + 6);
    ctx.fillStyle = accent;
    ctx.font = font(26, '800');
    ctx.fillText(String(p.points), colPts, cy + 8);
    ctx.textAlign = 'left';
  });

  // Pie con el reglamento
  const fy = H - FOOTER_H + 30;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, fy - 18);
  ctx.lineTo(W - PAD, fy - 18);
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.font = font(14, '500');
  ctx.fillText(
    `Victoria +${scoring.victoria}  ·  Derrota en tie-break +${scoring.derrotaTieBreak}  ·  Fecha perfecta +${scoring.fechaPerfecta}  ·  Apoyo +${scoring.apoyoVictoria}/+${scoring.apoyoDerrota}`,
    PAD,
    fy + 8,
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `puntaco-${group.name.toLowerCase().replace(/\s+/g, '-')}-${stamp}.png`;

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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
