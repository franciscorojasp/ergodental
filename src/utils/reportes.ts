// src/utils/reportes.ts
// Generador de reportes PDF usando jsPDF + jspdf-autotable
// Estándares: portada institucional, encabezado/pie, tabla de datos, resumen de totales
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getGlobalCorrelativo, logAuditoria } from '../api';

export interface ConfigReporte {
  titulo: string;               // "Reporte de Ingresos"
  subtitulo?: string;           // "Periodo: Mensual | Moneda: USD"
  clinica?: string;             // "Ergodentalve"
  periodo?: string;
  usuario?: string;             // quien genera el reporte
  columnas: string[];           // headers
  filas: (string | number)[][]; // datos de la tabla
  totales?: { label: string; valor: string }[];   // pie: subtotales
  notas?: string[];             // notas al pie
  orientacion?: 'portrait' | 'landscape'; // Automático o manual
  kpis?: { label: string; valor: string; subtitulo?: string }[];
  graficoImg?: { dataUrl: string; width: number; height: number };
}

// Paleta Corporativa ErgoDentalVE para Reportes PDF
const BRAND_CYAN: [number, number, number] = [0, 212, 255];
const BRAND_DARK: [number, number, number] = [15, 23, 42];
const TABLE_HEADER_GRAY: [number, number, number] = [108, 117, 125]; // Gris mediano para encabezados de tabla
const DIVIDER_GRAY: [number, number, number] = [209, 213, 219];      // Gris para franja divisoria fina

function addHeader(doc: jsPDF, config: ConfigReporte, correlativo?: string): number {
  const W = doc.internal.pageSize.getWidth();
  
  // Encabezado con fondo blanco/limpio (sin color azul oscuro)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 26, 'F');

  // Logo Gráfico
  try {
    doc.addImage('/logo.png', 'PNG', 12, 3.5, 18, 18);
  } catch (e) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('ERGODENTALVE', 14, 13);
  }

  // Título Institucional y Lema en color negro
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ERGODENTALVE', 34, 9.5);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text('Sistema Integral de Gestión Clínica Dental', 34, 14.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Seguridad · Innovación · Salud Odontológica', 34, 19);
  
  // Metadatos a la derecha en color negro y formato "DOC - N° 1792682558"
  if (correlativo) {
    const numDoc = correlativo.replace(/^DOC-?/i, '');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`DOC - N° ${numDoc}`, W - 14, 9.5, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text(`Emisión: ${new Date().toLocaleString('es-VE')}`, W - 14, 14.5, { align: 'right' });
  if (config.usuario) {
    doc.setTextColor(60, 60, 60);
    doc.text(`Operador: ${config.usuario}`, W - 14, 19, { align: 'right' });
  }

  // Franja divisoria: mucho menos gruesa y de color gris
  doc.setFillColor(...DIVIDER_GRAY);
  doc.rect(0, 24, W, 0.6, 'F');

  // Título del reporte
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(config.titulo.toUpperCase(), 14, 33);

  let startYPos = 39;

  if (config.clinica) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Sede / Clínica: ${config.clinica}`, 14, startYPos);
    startYPos += 4.5;
  }

  if (config.subtitulo) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(config.subtitulo, 14, startYPos);
    startYPos += 4.5;
  }
  
  return startYPos + 2;
}

function addFooter(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, H - 12, W, H - 12);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Ergodentalve · Sistema de Gestión Odontológica Avanzada · Documento Confidencial', 14, H - 4.5);
    doc.text(`Página ${i} de ${totalPages}`, W - 14, H - 4.5, { align: 'right' });
  }
}

export async function generarReportePDF(config: ConfigReporte): Promise<void> {
  try {
    if (!config || !config.titulo || !config.columnas) {
      throw new Error('Configuración de reporte incompleto o inválida.');
    }

    // Decisión de orientación de página tamaño CARTA:
    // Si la tabla tiene 6 o más columnas, se orienta automáticamente en HORIZONTAL (landscape)
    // para evitar apiñamiento y garantizar máxima legibilidad, o se respeta la opción elegida.
    const orientacion: 'portrait' | 'landscape' = 
      config.orientacion || (config.columnas.length >= 6 ? 'landscape' : 'portrait');

    const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    
    const finalAutoTable = autoTable || (doc as any).autoTable;
    if (!finalAutoTable) {
       console.error("Librería jspdf-autotable no se cargó correctamente.");
       throw new Error("Error interno: No se pudo cargar el generador de tablas PDF.");
    }

    let correlativo = 'SN-000000';
    try {
      correlativo = await getGlobalCorrelativo();
    } catch (e) {
      correlativo = `TMP-${Math.floor(Date.now() / 1000)}`;
    }

    let currentY = addHeader(doc, config, correlativo);

    // ── RENDERIZADO DE KPIs EJECUTIVOS (Si aplica) ─────────────────────
    if (config.kpis && config.kpis.length > 0) {
      const kpis = config.kpis;
      const count = kpis.length;
      const gap = 3;
      const availableW = W - 28;
      const cardW = (availableW - (count - 1) * gap) / count;
      const cardH = 15;

      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * (cardW + gap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        if (typeof (doc as any).roundedRect === 'function') {
          (doc as any).roundedRect(x, currentY, cardW, cardH, 2, 2, 'FD');
        } else {
          doc.rect(x, currentY, cardW, cardH, 'FD');
        }

        // Título KPI
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label.toUpperCase(), x + 3, currentY + 4.5);

        // Valor KPI
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(8, 14, 34);
        doc.text(kpi.valor, x + 3, currentY + 10);

        if (kpi.subtitulo) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text(kpi.subtitulo, x + 3, currentY + 13.5);
        }
      });

      currentY += cardH + 5;
    }

    // ── RENDERIZADO DE GRÁFICO (Canvas Imagen en PDF si aplica) ────────
    if (config.graficoImg && config.graficoImg.dataUrl) {
      const maxImgW = Math.min(180, W - 28);
      const imgH = (maxImgW * config.graficoImg.height) / config.graficoImg.width;
      
      // Si cabe cómodamente en la primera página antes de la tabla:
      if (currentY + imgH < (orientacion === 'landscape' ? 140 : 180)) {
        const imgX = (W - maxImgW) / 2;
        try {
          doc.addImage(config.graficoImg.dataUrl, 'PNG', imgX, currentY, maxImgW, imgH);
          currentY += imgH + 5;
        } catch (e) {
          console.warn('No se pudo insertar imagen de gráfico en el PDF:', e);
        }
      }
    }

    // ── NORMALIZACIÓN Y CREACIÓN DE TABLA ──────────────────────────────
    const safeRows = (config.filas || []).map(row => 
      (row || []).map(cell => (cell === null || cell === undefined ? '-' : String(cell)))
    );

    const isDense = config.columnas.length >= 7;

    finalAutoTable(doc, {
      startY: currentY,
      head: [config.columnas],
      body: safeRows,
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_HEADER_GRAY, // Gris mediano
        textColor: [255, 255, 255],
        fontSize: isDense ? 7.5 : 8.5,
        fontStyle: 'bold',
        cellPadding: isDense ? 2 : 2.5,
        halign: 'left',
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      bodyStyles: { 
        fontSize: isDense ? 7 : 8, 
        cellPadding: isDense ? 1.8 : 2.2, 
        textColor: [30, 41, 59] 
      },
      columnStyles: { 
        0: { fontStyle: 'bold' } 
      },
      margin: { left: 14, right: 14 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.15,
    });

    // ── TOTALES Y RESUMEN FINANCIERO AL PIE ────────────────────────────
    if (config.totales && config.totales.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = (lastTable ? lastTable.finalY : currentY + 20) + 4;
      const boxWidth = orientacion === 'landscape' ? 84 : 76;
      const boxHeight = config.totales.length * 6 + 6;

      if (finalY + boxHeight < (orientacion === 'landscape' ? 190 : 255)) {
        doc.setFillColor(...BRAND_DARK);
        if (typeof (doc as any).roundedRect === 'function') {
          (doc as any).roundedRect(W - 14 - boxWidth, finalY, boxWidth, boxHeight, 2, 2, 'F');
        } else {
          doc.rect(W - 14 - boxWidth, finalY, boxWidth, boxHeight, 'F');
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        config.totales.forEach((t, i) => {
          doc.setFont('helvetica', 'normal');
          doc.text(t.label || '', W - 14 - boxWidth + 4, finalY + 5.5 + i * 6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...BRAND_CYAN);
          doc.text(String(t.valor || '0.00'), W - 18, finalY + 5.5 + i * 6, { align: 'right' });
          doc.setTextColor(255, 255, 255);
        });
      }
    }

    // ── NOTAS AL PIE ──────────────────────────────────────────────────
    if (config.notas && config.notas.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = (lastTable ? lastTable.finalY : currentY + 20);
      const noteY = finalY + (config.totales ? config.totales.length * 6 + 12 : 8);
      
      const maxAvailableY = orientacion === 'landscape' ? 195 : 255;
      if (noteY < maxAvailableY) {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        config.notas.forEach((n, i) => {
          if (n && noteY + i * 4 < maxAvailableY) {
            doc.text(`* ${n}`, 14, noteY + i * 4);
          }
        });
      }
    }

    addFooter(doc);

    // ── GUARDADO Y DESCARGA ───────────────────────────────────────────
    const filename = `${config.titulo.toLowerCase().replace(/\s+/g, '_')}_${correlativo}_${new Date().toISOString().slice(0,10)}.pdf`;
    
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn('Error en doc.save(), intentando método alternativo vía Blob:', saveError);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    }
    
    // Registro de auditoría
    logAuditoria({
      usuario: config.usuario || 'Sistema',
      accion: 'GENERACIÓN DOCUMENTO PDF',
      detalle: `Documento de tipo: ${config.titulo} (${orientacion})`,
      documentoId: correlativo
    }).catch(err => console.debug('Auditoría omitida (posible modo offline):', err));
    
  } catch (error) {
    console.error('Error durante la generación del reporte PDF:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido de sistema';
    alert(`No se pudo completar el reporte: ${errorMsg}\nRecomendación: Verifique sus filtros e intente nuevamente.`);
  }
}

export async function generarManualPDF(topic: { titulo: string; puntos: string[] }, usuario?: string): Promise<void> {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const correlativo = await getGlobalCorrelativo();
    
    addHeader(doc, { 
      titulo: topic.titulo, 
      subtitulo: 'Documentación Oficial ErgoDentalve',
      usuario,
      columnas: [], filas: [] 
    }, correlativo);

    const W = doc.internal.pageSize.getWidth();
    let currentY = 70;

    topic.puntos.forEach(punto => {
      let textToPrint = punto;
      let fontSize = 10;
      let fontStyle = 'normal';
      let textColor: [number, number, number] = [60, 60, 60];
      let indent = 14;

      if (punto.startsWith('# ')) {
        textToPrint = punto.replace('# ', '');
        fontSize = 14;
        fontStyle = 'bold';
        textColor = [8, 14, 34];
        currentY += 4;
      } else if (punto.startsWith('## ')) {
        textToPrint = punto.replace('## ', '');
        fontSize = 12;
        fontStyle = 'bold';
        textColor = [40, 40, 40];
        currentY += 2;
      } else if (punto.startsWith('* ')) {
        textToPrint = '• ' + punto.replace('* ', '');
        indent = 18;
      }

      doc.setFontSize(fontSize);
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', fontStyle);

      const lines = doc.splitTextToSize(textToPrint, W - indent - 14);
      
      if (currentY + (lines.length * (fontSize * 0.4)) > 260) {
        doc.addPage();
        let newTblStartY = addHeader(doc, { titulo: topic.titulo, subtitulo: 'Documentación Oficial ErgoDentalve', columnas:[], filas:[] }, correlativo);
        currentY = newTblStartY;
        
        doc.setFontSize(fontSize);
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', fontStyle);
      }

      doc.text(lines, indent, currentY);
      currentY += (lines.length * (fontSize * 0.45)) + 3;
    });

    addFooter(doc);
    
    const filename = `manual_${topic.titulo.toLowerCase().replace(/\s+/g, '_')}_${correlativo}.pdf`;
    doc.save(filename);
    
    try {
      await logAuditoria({
        usuario: usuario || 'Sistema',
        accion: 'DESCARGA DE MANUAL ASISTIDA',
        detalle: `Tema: ${topic.titulo}`,
        documentoId: correlativo
      });
    } catch (e) {}
    
  } catch (error) {
    console.error('Error generando manual PDF:', error);
    alert('Ocurrió un error al generar la guía en PDF.');
  }
}

// ── Helpers de formato rápido para tablas ─────────────────────────────────────
export const fmtUSD = (n: number) => `$${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtBS  = (n: number, tasa: number) => `Bs ${((n || 0) * (tasa || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtFecha = () => new Date().toLocaleDateString('es-VE', { day:'2-digit', month:'long', year:'numeric' });
