// src/utils/reportes.ts
// Generador de reportes PDF usando jsPDF + jspdf-autotable
// Estándares: portada institucional, encabezado/pie, tabla de datos, resumen de totales
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getGlobalCorrelativo, logAuditoria } from '../api';

export interface ConfigReporte {
  titulo: string;               // "Reporte de Ingresos"
  subtitulo?: string;           // "Periodo: Mensual | Moneda: USD"
  clinica?: string;             // "Ergodental"
  periodo?: string;
  usuario?: string;             // quien genera el reporte
  columnas: string[];           // headers
  filas: (string | number)[][]; // datos de la tabla
  totales?: { label: string; valor: string }[];   // pie: subtotales
  notas?: string[];             // notas al pie
}

const BRAND_COLOR: [number, number, number] = [30, 90, 180];   // #1e5ab4
const ACCENT_COLOR: [number, number, number] = [0, 210, 140];  // #00d28c

function addHeader(doc: jsPDF, config: ConfigReporte, correlativo?: string) {
  const W = doc.internal.pageSize.getWidth();
  // Banda superior
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, W, 28, 'F');

  // Logo Gráfico
  try {
    doc.addImage('/logo.png', 'PNG', 12, 5, 20, 20); // x, y, width, height
  } catch (e) {
    // Fallback al texto si el logo no carga
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ERGODENTAL', 16, 12);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestión Clínica Dental', 36, 14);
  doc.text('Seguridad · Innovación · Salud', 36, 19);
  
  if (correlativo) {
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${correlativo}`, W - 14, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, W - 14, 19, { align: 'right' });
  if (config.usuario) doc.text(`Usuario: ${config.usuario}`, W - 14, 24, { align: 'right' });

  // Stripe accent
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 28, W, 2, 'F');

  // Título del reporte
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(config.titulo, 14, 42);

  let startYPos = 50;

  if (config.clinica) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 90, 180);
    doc.text(`Ámbito: ${config.clinica}`, 14, startYPos);
    startYPos += 6;
  }

  if (config.subtitulo) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(config.subtitulo, 14, startYPos);
    startYPos += 6;
  }
  
  return startYPos + 4; // Retornamos la posición Y para iniciar la tabla
}

function addFooter(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.text('Ergodental · Sistema de Gestión Clínica Dental · Documento confidencial', 14, H - 5);
    doc.text(`Página ${i} de ${totalPages}`, W - 14, H - 5, { align: 'right' });
  }
}

export async function generarReportePDF(config: ConfigReporte): Promise<void> {
  try {
    // 1. Verificación defensiva de la configuración
    if (!config || !config.titulo || !config.columnas) {
      throw new Error('Configuración de reporte incompleto o inválida.');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    
    // 2. Obtención segura del correlativo
    let correlativo = 'SN-000000';
    try {
      correlativo = await getGlobalCorrelativo();
    } catch (e) {
      console.warn('Error obteniendo correlativo real, se usará identificador temporal:', e);
      correlativo = `TMP-${Math.floor(Date.now() / 1000)}`;
    }

    const tblStartY = addHeader(doc, config, correlativo);

    // 3. Normalización defensiva de datos (evita errores si hay valores nulos o indefinidos)
    const safeRows = (config.filas || []).map(row => 
      (row || []).map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell);
      })
    );

    // 4. Generación de tabla con jsPDF-AutoTable
    autoTable(doc, {
      startY: tblStartY,
      head: [config.columnas],
      body: safeRows,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_COLOR,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [245, 249, 255] },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 40] },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
      tableLineColor: [210, 220, 235],
      tableLineWidth: 0.2,
      didDrawPage: () => {
        // En cada página nueva, el footer se agrega al final
      }
    });

    // 5. Bloque de totales con comprobación de existencia
    if (config.totales && config.totales.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = (lastTable ? lastTable.finalY : tblStartY + 20) + 6;
      const W = doc.internal.pageSize.getWidth();

      doc.setFillColor(...BRAND_COLOR);
      
      const boxWidth = 76;
      const boxHeight = config.totales.length * 7 + 8;
      
      // Comprobación de método roundedRect
      if (typeof (doc as any).roundedRect === 'function') {
        (doc as any).roundedRect(W - 90, finalY, boxWidth, boxHeight, 2, 2, 'F');
      } else {
        doc.rect(W - 90, finalY, boxWidth, boxHeight, 'F');
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      config.totales.forEach((t, i) => {
        doc.setFont('helvetica', 'normal');
        doc.text(t.label || '', W - 87, finalY + 8 + i * 7);
        doc.setFont('helvetica', 'bold');
        doc.text(String(t.valor || '0.00'), W - 17, finalY + 8 + i * 7, { align: 'right' });
      });
    }

    // 6. Notas al pie del contenido
    if (config.notas && config.notas.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = (lastTable ? lastTable.finalY : tblStartY + 20);
      const noteY = finalY + (config.totales ? config.totales.length * 7 + 18 : 10);
      
      // No escribir fuera de la página
      if (noteY < 260) {
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'italic');
        config.notas.forEach((n, i) => {
          if (n) doc.text(`* ${n}`, 14, noteY + i * 5);
        });
      }
    }

    addFooter(doc);

    // 7. Guardado y Manejo de Errores de descarga
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
    
    // 8. Registro de auditoría (SILENCIOSO - no debe romper la experiencia si falla la red)
    logAuditoria({
      usuario: config.usuario || 'Sistema',
      accion: 'GENERACIÓN DOCUMENTO PDF',
      detalle: `Documento de tipo: ${config.titulo}`,
      documentoId: correlativo
    }).catch(err => console.debug('Auditoría omitida (posible modo offline):', err));
    
  } catch (error) {
    console.error('Error durante la generación del reporte PDF:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido de sistema';
    alert(`No se pudo completar el reporte: ${errorMsg}\nRecomendación: Verifique sus filtros e intente nuevamente.`);
  }
}

export async function generarAyudaPDF(topic: { titulo: string; puntos: string[] }, usuario?: string): Promise<void> {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const correlativo = await getGlobalCorrelativo();
    
    // Reutilizamos el header con una config mínima
    addHeader(doc, { 
      titulo: topic.titulo, 
      subtitulo: 'Guía de Ayuda ErgoDental',
      usuario,
      columnas: [], filas: [] 
    }, correlativo);

    const W = doc.internal.pageSize.getWidth();
    let currentY = 70; // bajamos un poco por si hay ámbito

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');

    topic.puntos.forEach(punto => {
      // Si el punto es muy largo, lo dividimos
      const lines = doc.splitTextToSize(`• ${punto}`, W - 28);
      
      // Verificar si necesitamos nueva página
      if (currentY + (lines.length * 6) > 260) {
        doc.addPage();
        let newTblStartY = addHeader(doc, { titulo: topic.titulo, subtitulo: 'Guía de Ayuda ErgoDental', columnas:[], filas:[] }, correlativo);
        currentY = newTblStartY;
      }

      doc.text(lines, 14, currentY);
      currentY += (lines.length * 7);
    });

    addFooter(doc);
    
    const filename = `ayuda_${topic.titulo.toLowerCase().replace(/\s+/g, '_')}_${correlativo}.pdf`;
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
    console.error('Error generando ayuda PDF:', error);
    alert('Ocurrió un error al generar la guía en PDF.');
  }
}

// ── Helpers de formato rápido para tablas ─────────────────────────────────────
export const fmtUSD = (n: number) => `$${n.toFixed(2)}`;
export const fmtBS  = (n: number, tasa: number) => `Bs ${(n * tasa).toLocaleString('es-VE', {maximumFractionDigits: 0})}`;
export const fmtFecha = () => new Date().toLocaleDateString('es-VE', {day:'2-digit', month:'long', year:'numeric'});
