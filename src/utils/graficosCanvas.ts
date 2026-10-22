// src/utils/graficosCanvas.ts
// Motor ligero de renderizado gráfico de alta resolución en Canvas 2D
// Diseñado con la identidad visual corporativa ErgoDentalVE

export interface ItemGrafico {
  label: string;
  valor: number;
  color?: string;
  porcentaje?: number;
}

const BRAND_PALETTE = [
  '#00d4ff', // Cian ErgoDental
  '#8b5cf6', // Morado Accent
  '#10b981', // Verde Éxito
  '#f59e0b', // Ámbar Alerta
  '#ec4899', // Rosa
  '#3b82f6', // Azul Real
  '#06b6d4', // Turquesa
  '#a855f7', // Púrpura
];

/**
 * Renderiza un gráfico Donut (Torta) de alta resolución con leyendas
 */
export function renderDonutChart(
  items: ItemGrafico[],
  canvasWidth = 700,
  canvasHeight = 320,
  isDark = true
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: canvasWidth, height: canvasHeight };

  // Fondo
  ctx.fillStyle = isDark ? '#080c1c' : '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const total = items.reduce((acc, curr) => acc + curr.valor, 0);
  if (total === 0) {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos registrados en el período', canvasWidth / 2, canvasHeight / 2);
    return { dataUrl: canvas.toDataURL('image/png'), width: canvasWidth, height: canvasHeight };
  }

  // Dimensiones del Donut
  const centerX = canvasWidth * 0.32;
  const centerY = canvasHeight * 0.5;
  const radius = Math.min(centerX, centerY) * 0.78;
  const innerRadius = radius * 0.58;

  let startAngle = -Math.PI / 2;

  items.forEach((item, index) => {
    const sliceAngle = (item.valor / total) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const color = item.color || BRAND_PALETTE[index % BRAND_PALETTE.length];

    // Arco exterior
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 6;
    ctx.fill();

    startAngle = endAngle;
  });

  // Limpiar sombra para textos
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Texto central
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = '900 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(items.length.toString(), centerX, centerY - 8);

  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  ctx.font = '600 11px Outfit, sans-serif';
  ctx.fillText('MÉTODOS', centerX, centerY + 14);

  // Leyendas a la derecha
  const legendX = canvasWidth * 0.62;
  const startLegendY = Math.max(30, centerY - (items.length * 28) / 2);

  items.forEach((item, index) => {
    const legendY = startLegendY + index * 28;
    const color = item.color || BRAND_PALETTE[index % BRAND_PALETTE.length];
    const pct = ((item.valor / total) * 100).toFixed(1);

    // Indicador circular de color
    ctx.beginPath();
    ctx.arc(legendX, legendY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Etiqueta
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px Outfit, sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.fillText(item.label, legendX + 16, legendY - 2);

    // Detalle valor y porcentaje
    ctx.font = '500 11px Outfit, sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(`${pct}%  ·  $${item.valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, legendX + 16, legendY + 12);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvasWidth,
    height: canvasHeight
  };
}

/**
 * Renderiza un gráfico de Barras horizontales comparativas de alta resolución
 */
export function renderBarChart(
  items: ItemGrafico[],
  canvasWidth = 700,
  canvasHeight = 320,
  isDark = true
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: canvasWidth, height: canvasHeight };

  ctx.fillStyle = isDark ? '#080c1c' : '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (items.length === 0) {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin registros para generar gráfico', canvasWidth / 2, canvasHeight / 2);
    return { dataUrl: canvas.toDataURL('image/png'), width: canvasWidth, height: canvasHeight };
  }

  const maxVal = Math.max(...items.map(i => i.valor), 1);
  const paddingX = 40;
  const paddingY = 30;
  const barHeight = Math.min(22, (canvasHeight - paddingY * 2) / (items.length * 1.6));
  const maxBarWidth = canvasWidth - paddingX - 220;

  items.slice(0, 7).forEach((item, index) => {
    const y = paddingY + index * (barHeight * 1.6);
    const barWidth = (item.valor / maxVal) * maxBarWidth;
    const color = item.color || BRAND_PALETTE[index % BRAND_PALETTE.length];

    // Etiqueta
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    const labelText = item.label.length > 22 ? item.label.substring(0, 20) + '...' : item.label;
    ctx.fillText(labelText, paddingX, y + barHeight / 2);

    const barX = paddingX + 160;

    // Barra de fondo
    ctx.beginPath();
    ctx.roundRect(barX, y, maxBarWidth, barHeight, 4);
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fill();

    // Barra de progreso rellena
    if (barWidth > 2) {
      ctx.beginPath();
      ctx.roundRect(barX, y, barWidth, barHeight, 4);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Valor al final de la barra
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.fillText(`${item.valor}`, barX + barWidth + 8, y + barHeight / 2);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvasWidth,
    height: canvasHeight
  };
}
