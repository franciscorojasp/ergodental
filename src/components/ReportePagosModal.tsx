// src/components/ReportePagosModal.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useMoneda } from '../contexts/MonedaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { getPagos, getPacientes, getPersonal, getCitas, type Pago, type Paciente, type Personal, type Cita } from '../api';
import { generarReportePDF, fmtUSD, fmtBS } from '../utils/reportes';
import { renderDonutChart, type ItemGrafico } from '../utils/graficosCanvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Periodo = 'Hoy' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual' | 'Personalizado';

const DIAS_PERIODO: Record<string, number> = {
  Hoy: 1,
  Semanal: 7,
  Quincenal: 15,
  Mensual: 30,
  Trimestral: 90,
  Semestral: 180,
  Anual: 365,
};

export default function ReportePagosModal({ isOpen, onClose }: Props) {
  const { clinica } = useClinica();
  const { tasaBCV } = useMoneda();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [periodo, setPeriodo] = useState<Periodo>('Mensual');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroMetodo, setFiltroMetodo] = useState<string>('Todos');
  const [orientacion, setOrientacion] = useState<'landscape' | 'portrait'>('landscape');
  
  // Pestañas internas del reporte
  const [tabReporte, setTabReporte] = useState<'resumen' | 'detalle' | 'compartir'>('resumen');

  // Destinatarios para compartir (Selección de lista)
  const [selectedPersonalIds, setSelectedPersonalIds] = useState<string[]>([]);
  const [filtroRolDestinatario, setFiltroRolDestinatario] = useState<string>('todos');
  const [busquedaDestinatario, setBusquedaDestinatario] = useState<string>('');
  const [telefonoManual, setTelefonoManual] = useState('');
  const [emailManual, setEmailManual] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [mostrarManual, setMostrarManual] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [enviadosWhatsApp, setEnviadosWhatsApp] = useState<Record<string, boolean>>({});

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getPagos(), getPacientes(), getPersonal(), getCitas()])
        .then(([p, pac, pers, c]) => {
          const filterClinica = (item: { clinicaId?: string }) => 
            clinica.id === 'consolidado' || item.clinicaId === clinica.id;

          setPagos(p.filter(filterClinica));
          setPacientes(pac.filter(filterClinica));
          setPersonal(pers.filter(filterClinica));
          setCitas(c.filter(filterClinica));
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, clinica.id]);

  // Filtrado de pagos según período
  const pagosFiltrados = useMemo(() => {
    const hoyDate = new Date();
    hoyDate.setHours(23, 59, 59, 999);

    return pagos.filter(p => {
      if (p.estado !== 'Pagado' && p.estado !== 'Parcial') return false;
      if (filtroMetodo !== 'Todos' && p.metodoPago !== filtroMetodo) return false;

      const pDate = new Date(p.fecha + 'T12:00:00');
      if (isNaN(pDate.getTime())) return false;

      if (periodo === 'Personalizado') {
        const start = new Date(fechaInicio + 'T00:00:00');
        const end = new Date(fechaFin + 'T23:59:59');
        return pDate >= start && pDate <= end;
      }

      const diffDias = Math.floor((hoyDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias < (DIAS_PERIODO[periodo] || 30);
    });
  }, [pagos, periodo, fechaInicio, fechaFin, filtroMetodo]);

  // Citas del período para pacientes atendidos
  const citasFiltradas = useMemo(() => {
    const hoyDate = new Date();
    return citas.filter(c => {
      const cDate = new Date(c.fecha + 'T12:00:00');
      if (isNaN(cDate.getTime())) return false;

      if (periodo === 'Personalizado') {
        const start = new Date(fechaInicio + 'T00:00:00');
        const end = new Date(fechaFin + 'T23:59:59');
        return cDate >= start && cDate <= end;
      }

      const diffDias = Math.floor((hoyDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias < (DIAS_PERIODO[periodo] || 30);
    });
  }, [citas, periodo, fechaInicio, fechaFin]);

  // Totales
  const totalMontoUSD = useMemo(() => pagosFiltrados.reduce((s, p) => s + p.monto, 0), [pagosFiltrados]);
  const totalCantidadPagos = pagosFiltrados.length;
  const ticketPromedio = totalCantidadPagos > 0 ? totalMontoUSD / totalCantidadPagos : 0;

  // Pacientes únicos atendidos (pagos o citas)
  const pacientesAtendidosIds = useMemo(() => {
    const setIds = new Set<string>();
    pagosFiltrados.forEach(p => p.pacienteId && setIds.add(p.pacienteId));
    citasFiltradas.forEach(c => c.pacienteId && setIds.add(c.pacienteId));
    return Array.from(setIds);
  }, [pagosFiltrados, citasFiltradas]);

  // Discriminación por tipo / método de pago
  const discriminacionMetodos: ItemGrafico[] = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    pagosFiltrados.forEach(p => {
      const metodo = p.metodoPago || 'Otro';
      if (!map[metodo]) map[metodo] = { total: 0, count: 0 };
      map[metodo].total += p.monto;
      map[metodo].count += 1;
    });

    return Object.entries(map)
      .map(([label, data]) => ({
        label,
        valor: data.total,
        porcentaje: totalMontoUSD > 0 ? (data.total / totalMontoUSD) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [pagosFiltrados, totalMontoUSD]);

  // Discriminación por doctor / especialista
  const discriminacionDoctores: ItemGrafico[] = useMemo(() => {
    const map: Record<string, number> = {};
    pagosFiltrados.forEach(p => {
      const doc = p.doctorNombre || 'General';
      map[doc] = (map[doc] || 0) + 1;
    });

    return Object.entries(map)
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [pagosFiltrados]);

  // Renderizar canvas interactivo en la vista
  useEffect(() => {
    if (!chartCanvasRef.current || tabReporte !== 'resumen') return;
    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generar imagen Donut y estamparla
    const chart = renderDonutChart(discriminacionMetodos, 640, 260, true);
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = chart.dataUrl;
  }, [discriminacionMetodos, tabReporte]);

  // Generador oficial de PDF en tamaño carta
  const handleDescargarPDF = async () => {
    const donutImg = renderDonutChart(discriminacionMetodos, 700, 280, false);

    const columnas = orientacion === 'landscape'
      ? ['Fecha', 'Paciente', 'Cédula', 'Doctor', 'Concepto', 'Método', 'Tipo', 'Monto USD', 'Monto Bs', 'Estado']
      : ['Fecha', 'Paciente', 'Concepto', 'Método', 'Monto USD', 'Monto Bs'];

    const filas = pagosFiltrados.map(p => {
      const pac = pacientes.find(px => px.id === p.pacienteId);
      const cedula = pac?.cedula || '—';

      if (orientacion === 'landscape') {
        return [
          p.fecha || '—',
          p.pacienteNombre || '—',
          cedula,
          p.doctorNombre || 'General',
          p.concepto || 'Atención Odontológica',
          p.metodoPago || '—',
          p.tipoPago || 'Contado',
          fmtUSD(p.monto),
          fmtBS(p.monto, tasaBCV),
          p.estado.toUpperCase()
        ];
      } else {
        return [
          p.fecha || '—',
          p.pacienteNombre || '—',
          p.concepto || 'Atención Odontológica',
          p.metodoPago || '—',
          fmtUSD(p.monto),
          fmtBS(p.monto, tasaBCV)
        ];
      }
    });

    const kpis = [
      { label: 'Total Recaudado', valor: fmtUSD(totalMontoUSD), subtitulo: fmtBS(totalMontoUSD, tasaBCV) },
      { label: 'Pagos Recibidos', valor: `${totalCantidadPagos} Pagos`, subtitulo: 'Transacciones registradas' },
      { label: 'Pacientes Atendidos', valor: `${pacientesAtendidosIds.length} Pacientes`, subtitulo: 'Consultas y procedimientos' },
      { label: 'Ticket Promedio', valor: fmtUSD(ticketPromedio), subtitulo: 'Por transacción cobrada' },
    ];

    const totales = [
      { label: `Total Cobrado (${periodo}):`, valor: fmtUSD(totalMontoUSD) },
      { label: `Equivalente en Bolívares:`, valor: fmtBS(totalMontoUSD, tasaBCV) },
      { label: `Transacciones efectivas:`, valor: `${totalCantidadPagos} pagos` },
      { label: `Pacientes atendidos:`, valor: `${pacientesAtendidosIds.length} pacientes` }
    ];

    const subtituloPeriodo = periodo === 'Personalizado'
      ? `Rango: ${fechaInicio} al ${fechaFin}`
      : `Período: ${periodo} (Últimos ${DIAS_PERIODO[periodo] || 30} días)`;

    await generarReportePDF({
      titulo: 'Reporte Ejecutivo de Recaudación y Pacientes Atendidos',
      subtitulo: `${subtituloPeriodo} · Tasa Oficial BCV: Bs ${tasaBCV.toLocaleString('es-VE', { maximumFractionDigits: 0 })} · Moneda Base: USD`,
      clinica: clinica.nombre,
      usuario: user?.nombre || 'Administrador',
      orientacion: orientacion,
      kpis,
      graficoImg: donutImg,
      columnas,
      filas,
      totales,
      notas: [
        'Documento formal de auditoría y balance clínico generado por ErgoDentalVE.',
        'La discriminación incluye todos los pagos en estado Pagado y Parcial dentro del rango evaluado.',
        `Tasa de cambio BCV aplicada: Bs ${tasaBCV.toLocaleString('es-VE', { maximumFractionDigits: 0 })} por cada $1 USD.`
      ]
    });
  };

  // Construcción del mensaje para WhatsApp
  const buildMensajeWhatsApp = () => {
    let msg = `🦷 *INFORME EJECUTIVO DE RECAUDACIÓN Y PACIENTES* 🦷\n`;
    msg += `🏥 *Clínica:* ${clinica.nombre.toUpperCase()}\n`;
    msg += `📅 *Período:* ${periodo === 'Personalizado' ? `${fechaInicio} al ${fechaFin}` : periodo}\n`;
    msg += `💱 *Tasa BCV:* Bs ${tasaBCV.toLocaleString('es-VE', { maximumFractionDigits: 0 })} / $1 USD\n\n`;

    msg += `📊 *RESUMEN GENERAL:*\n`;
    msg += `💵 *Total Recaudado:* ${fmtUSD(totalMontoUSD)} (${fmtBS(totalMontoUSD, tasaBCV)})\n`;
    msg += `🧾 *Cantidad de Pagos:* ${totalCantidadPagos} transacciones\n`;
    msg += `👥 *Pacientes Atendidos:* ${pacientesAtendidosIds.length} personas\n`;
    msg += `📈 *Ticket Promedio:* ${fmtUSD(ticketPromedio)}\n\n`;

    msg += `💳 *DISCRIMINACIÓN POR MÉTODO DE PAGO:*\n`;
    discriminacionMetodos.forEach(m => {
      msg += `• *${m.label}:* ${fmtUSD(m.valor)} (${((m.valor / (totalMontoUSD || 1)) * 100).toFixed(1)}%)\n`;
    });

    msg += `\n_Reporte emitido automáticamente por ErgoDentalVE el ${new Date().toLocaleDateString('es-VE')}_`;
    return msg;
  };

  // ── SELECCIÓN Y GESTIÓN DE DESTINATARIOS EN LISTA ──
  const formatWhatsAppPhone = (rawPhone: string) => {
    let t = (rawPhone || '').replace(/\D/g, '');
    if (!t) return '';
    if (t.startsWith('04')) t = '58' + t.substring(1);
    else if (t.startsWith('4') && t.length === 10) t = '58' + t;
    return t;
  };

  // Filtrado de personal para lista de destinatarios
  const personalFiltrado = useMemo(() => {
    return personal.filter(p => {
      if (filtroRolDestinatario !== 'todos') {
        const tipo = (p.tipo || '').toLowerCase();
        if (filtroRolDestinatario === 'odontologos' && !tipo.includes('odont')) return false;
        if (filtroRolDestinatario === 'administracion' && !tipo.includes('admin') && !tipo.includes('coord')) return false;
        if (filtroRolDestinatario === 'recepcion' && !tipo.includes('recep') && !tipo.includes('asist')) return false;
      }
      if (busquedaDestinatario.trim()) {
        const q = busquedaDestinatario.toLowerCase();
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase();
        const matchRol = (p.tipo || '').toLowerCase().includes(q);
        const matchTel = (p.telefono || '').includes(q);
        const matchEmail = (p.email || '').toLowerCase().includes(q);
        if (!nombreCompleto.includes(q) && !matchRol && !matchTel && !matchEmail) return false;
      }
      return true;
    });
  }, [personal, filtroRolDestinatario, busquedaDestinatario]);

  const personasSeleccionadas = useMemo(() => {
    return personal.filter(p => selectedPersonalIds.includes(p.id));
  }, [personal, selectedPersonalIds]);

  const emailsSeleccionados = useMemo(() => {
    const list = personasSeleccionadas
      .map(p => p.email?.trim())
      .filter((e): e is string => !!e && e.includes('@'));
    if (emailManual.trim() && emailManual.includes('@')) {
      list.push(emailManual.trim());
    }
    return Array.from(new Set(list));
  }, [personasSeleccionadas, emailManual]);

  const toggleSelectPerson = (id: string) => {
    setSelectedPersonalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = personalFiltrado.map(p => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedPersonalIds.includes(id));
    if (allSelected) {
      setSelectedPersonalIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedPersonalIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleEnviarWhatsAppA = (rawPhone: string, idRef?: string) => {
    const tel = formatWhatsAppPhone(rawPhone);
    const texto = encodeURIComponent(buildMensajeWhatsApp());
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (idRef) {
      setEnviadosWhatsApp(prev => ({ ...prev, [idRef]: true }));
    }
  };

  const handleEnviarEmail = () => {
    const subject = encodeURIComponent(`Reporte Ejecutivo de Pagos y Pacientes - ${clinica.nombre} (${periodo})`);
    const body = encodeURIComponent(buildMensajeWhatsApp());
    const destinatarios = emailsSeleccionados.join(',');
    window.location.href = destinatarios ? `mailto:${destinatarios}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(buildMensajeWhatsApp());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.error('Error al copiar al portapapeles', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="modal"
          initial={{ opacity: 0, scale: 0.95, y: isMobile ? 30 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: isMobile ? 30 : 0 }}
          style={{ maxWidth: '960px', maxHeight: '92dvh' }}
        >
          <div className="modal-handle" />

          {/* Cabecera */}
          <div className="modal-header" style={{ background: 'linear-gradient(to right, rgba(0, 212, 255, 0.1), transparent)', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: isMobile ? '1.1rem' : '1.35rem' }}>
                <span>📊</span>
                <span>Reportes de Pagos y Pacientes</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Discriminación gráfica y detallada de recaudación por tipo de pago y pacientes
              </p>
            </div>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>

          {/* Pestañas Superiores */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
            {[
              { id: 'resumen', label: '📈 Resumen y Gráficos' },
              { id: 'detalle', label: `📋 Detalle (${totalCantidadPagos} Pagos)` },
              { id: 'compartir', label: '📤 Enviar (WhatsApp / Email)' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabReporte(t.id as any)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tabReporte === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: tabReporte === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: tabReporte === t.id ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Barra de Filtros Compacta */}
          <div style={{ padding: '12px 20px', background: 'rgba(0, 0, 0, 0.15)', borderBottom: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PERÍODO:</span>
              <select
                className="input input-sm"
                value={periodo}
                onChange={e => setPeriodo(e.target.value as Periodo)}
                style={{ width: 'auto', minWidth: '130px' }}
              >
                {(['Hoy', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual', 'Personalizado'] as Periodo[]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {periodo === 'Personalizado' && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="input input-sm"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    style={{ width: '130px' }}
                  />
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>al</span>
                  <input
                    type="date"
                    className="input input-sm"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    style={{ width: '130px' }}
                  />
                </div>
              )}

              <select
                className="input input-sm"
                value={filtroMetodo}
                onChange={e => setFiltroMetodo(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="Todos">Todos los Métodos</option>
                <option value="Efectivo $">Efectivo $</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Zelle">Zelle</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Punto de Venta">Punto de Venta</option>
                <option value="Efectivo Bs">Efectivo Bs</option>
              </select>
            </div>

            {/* Selector de Orientación Carta para el PDF */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>HOJA CARTA:</span>
              <button
                type="button"
                onClick={() => setOrientacion('landscape')}
                className={`btn btn-sm ${orientacion === 'landscape' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', height: '28px', fontSize: '0.72rem' }}
                title="Recomendada: Horizontal con todas las columnas detalladas"
              >
                ↔️ Horizontal
              </button>
              <button
                type="button"
                onClick={() => setOrientacion('portrait')}
                className={`btn btn-sm ${orientacion === 'portrait' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', height: '28px', fontSize: '0.72rem' }}
                title="Vertical estándar"
              >
                ↕️ Vertical
              </button>
            </div>
          </div>

          {/* Cuerpo Desplazable del Modal */}
          <div className="modal-body" style={{ padding: '16px 20px', minHeight: '340px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--primary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <p>Calculando discriminación de pagos y pacientes...</p>
              </div>
            ) : (
              <>
                {/* ── KPIs PRINCIPALES ─────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div className="stat-card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Recaudado</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>{fmtUSD(totalMontoUSD)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{fmtBS(totalMontoUSD, tasaBCV)}</div>
                  </div>

                  <div className="stat-card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pagos Recibidos</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>{totalCantidadPagos}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Transacciones</div>
                  </div>

                  <div className="stat-card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pacientes Atendidos</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)', marginTop: '2px' }}>{pacientesAtendidosIds.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Pacientes únicos</div>
                  </div>

                  <div className="stat-card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ticket Promedio</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>{fmtUSD(ticketPromedio)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Por cobro realizado</div>
                  </div>
                </div>

                {/* ── PESTAÑA: RESUMEN Y GRÁFICOS ──────────────────────── */}
                {tabReporte === 'resumen' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '16px' }}>
                      {/* Gráfico Donut de Métodos de Pago */}
                      <div className="glass" style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            🍩 Discriminación por Tipo de Pago
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {discriminacionMetodos.length} Métodos Activos
                          </span>
                        </div>
                        <canvas
                          ref={chartCanvasRef}
                          width={640}
                          height={260}
                          style={{ width: '100%', height: 'auto', maxHeight: '240px', borderRadius: '10px' }}
                        />
                      </div>

                      {/* Lista discriminada de métodos con porcentaje */}
                      <div className="glass" style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
                          📊 Participación Financiera
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                          {discriminacionMetodos.map((item) => (
                            <div key={item.label} style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                                <span>{item.label}</span>
                                <span style={{ color: 'var(--primary)' }}>{fmtUSD(item.valor)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                <span>{fmtBS(item.valor, tasaBCV)}</span>
                                <span style={{ fontWeight: 800 }}>{item.porcentaje?.toFixed(1)}%</span>
                              </div>
                              {/* Barra de progreso */}
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.porcentaje || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resumen de Pacientes Atendidos por Doctor */}
                    <div className="glass" style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                        👨‍⚕️ Pacientes Atendidos por Especialista ({periodo})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {discriminacionDoctores.map(doc => (
                          <div key={doc.label} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{doc.label}</span>
                            <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 800 }}>{doc.valor} atendidos</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PESTAÑA: DETALLE DE PAGOS Y PACIENTES ────────────── */}
                {tabReporte === 'detalle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="table-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      <table className="table-fixed" style={{ fontSize: '0.78rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '90px' }}>Fecha</th>
                            <th style={{ width: '160px' }}>Paciente</th>
                            <th className="hide-mobile" style={{ width: '130px' }}>Doctor</th>
                            <th>Concepto</th>
                            <th style={{ width: '110px' }}>Método</th>
                            <th style={{ width: '95px' }} className="text-right">Monto ($)</th>
                            <th className="hide-mobile text-right" style={{ width: '110px' }}>Monto (Bs)</th>
                            <th style={{ width: '85px' }} className="text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosFiltrados.map((p, i) => (
                            <tr key={p.id || i}>
                              <td>{p.fecha}</td>
                              <td style={{ fontWeight: 700 }}>{p.pacienteNombre}</td>
                              <td className="hide-mobile">{p.doctorNombre || 'General'}</td>
                              <td>{p.concepto}</td>
                              <td>
                                <span className="badge badge-muted" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                  {p.metodoPago}
                                </span>
                              </td>
                              <td className="text-right" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                {fmtUSD(p.monto)}
                              </td>
                              <td className="hide-mobile text-right" style={{ color: 'var(--text-secondary)' }}>
                                {fmtBS(p.monto, tasaBCV)}
                              </td>
                              <td className="text-center">
                                <span className={`badge ${p.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                  {p.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {pagosFiltrados.length === 0 && (
                            <tr><td colSpan={8} className="table-empty">No se encontraron pagos con los filtros seleccionados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── PESTAÑA: ENVIAR POR WHATSAPP / CORREO (SELECCIÓN DE LISTA) ────────────── */}
                {tabReporte === 'compartir' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '780px', margin: '0 auto' }}>
                    
                    {/* Tarjeta de Encabezado y Guía */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(37, 211, 102, 0.05))', border: '1px solid var(--primary-dim)', padding: '14px 18px', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📋</span>
                            <span>Seleccionar Destinatarios del Reporte</span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            Selecciona de la lista a las personas que recibirán este informe vía WhatsApp o Correo. Puedes elegir uno, varios o todos.
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                            {personasSeleccionadas.length} seleccionado(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Filtros y Búsqueda de Destinatarios */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
                          <input
                            type="text"
                            className="input input-sm"
                            placeholder="🔍 Buscar destinatario..."
                            value={busquedaDestinatario}
                            onChange={e => setBusquedaDestinatario(e.target.value)}
                            style={{ width: '100%', height: '32px', fontSize: '0.78rem', paddingLeft: '10px' }}
                          />
                        </div>

                        {/* Filtros por Rol */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'todos', label: `Todos (${personal.length})` },
                            { id: 'administracion', label: '💼 Admin' },
                            { id: 'odontologos', label: '👨‍⚕️ Doctores' },
                            { id: 'recepcion', label: '🏥 Recepción' },
                          ].map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFiltroRolDestinatario(f.id)}
                              className={`btn btn-sm ${filtroRolDestinatario === f.id ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ height: '32px', padding: '0 8px', fontSize: '0.72rem' }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Botón rápido Seleccionar/Deseleccionar Todos */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleSelectAllVisible}
                          className="btn btn-ghost btn-sm"
                          style={{ height: '32px', fontSize: '0.72rem', border: '1px solid var(--border)' }}
                        >
                          {personalFiltrado.length > 0 && personalFiltrado.every(p => selectedPersonalIds.includes(p.id))
                            ? '◻️ Desmarcar Visibles'
                            : '☑️ Marcar Visibles'}
                        </button>
                        {selectedPersonalIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedPersonalIds([])}
                            className="btn btn-ghost btn-sm text-danger"
                            style={{ height: '32px', fontSize: '0.72rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                          >
                            ✕ Limpiar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* LISTA INTERACTIVA DE DESTINATARIOS */}
                    <div
                      style={{
                        maxHeight: '230px',
                        overflowY: 'auto',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {personalFiltrado.map(p => {
                        const isSelected = selectedPersonalIds.includes(p.id);
                        const initiales = `${p.nombre?.[0] || ''}${p.apellido?.[0] || ''}`.toUpperCase() || 'P';
                        const telFormatted = p.telefono ? p.telefono : null;

                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleSelectPerson(p.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // controlado por el contenedor
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                              />
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                                  color: isSelected ? '#000' : 'var(--text-primary)',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {initiales}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {p.nombre} {p.apellido}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.tipo}</span>
                                  {p.especialidad && <span>· {p.especialidad}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Datos de Contacto Directo */}
                            <div style={{ textAlign: 'right', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {telFormatted ? (
                                <span style={{ color: '#25D366', fontWeight: 600 }}>💬 {telFormatted}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Sin WhatsApp</span>
                              )}
                              {p.email ? (
                                <span style={{ color: 'var(--text-secondary)' }}>✉️ {p.email}</span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {personalFiltrado.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No se encontraron personas con ese filtro o búsqueda.
                        </div>
                      )}
                    </div>

                    {/* Acordeón para Destinatario Externo / Manual */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setMostrarManual(!mostrarManual)}
                        className="btn btn-ghost"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>➕</span>
                          <span>Agregar Destinatario Adicional / Personalizado</span>
                        </span>
                        <span>{mostrarManual ? '▲ Ocultar' : '▼ Expandir'}</span>
                      </button>

                      {mostrarManual && (
                        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                          <div className="input-group">
                            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Nombre o Referencia:</label>
                            <input
                              type="text"
                              className="input input-sm"
                              placeholder="Ej. Dr. Socio / Dueño..."
                              value={nombreManual}
                              onChange={e => setNombreManual(e.target.value)}
                            />
                          </div>
                          <div className="input-group">
                            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>WhatsApp (ej. 04141234567):</label>
                            <input
                              type="tel"
                              className="input input-sm"
                              placeholder="0414..."
                              value={telefonoManual}
                              onChange={e => setTelefonoManual(e.target.value)}
                            />
                          </div>
                          <div className="input-group">
                            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Correo Electrónico:</label>
                            <input
                              type="email"
                              className="input input-sm"
                              placeholder="correo@ejemplo.com"
                              value={emailManual}
                              onChange={e => setEmailManual(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PANEL DE ACCIONES DE ENVÍO */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📤 Acciones de Despacho</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {personasSeleccionadas.length + (telefonoManual ? 1 : 0)} destinatario(s)
                        </span>
                      </div>

                      {/* Lista de Envío por WhatsApp */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {personasSeleccionadas.length === 1 && (
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsAppA(personasSeleccionadas[0].telefono, personasSeleccionadas[0].id)}
                            className="btn"
                            style={{
                              height: '42px',
                              background: '#25D366',
                              color: '#000',
                              fontWeight: 800,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '0.82rem'
                            }}
                          >
                            <span>📲</span>
                            <span>Enviar WhatsApp a {personasSeleccionadas[0].nombre} ({personasSeleccionadas[0].telefono || 'Sin número'})</span>
                          </button>
                        )}

                        {personasSeleccionadas.length > 1 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                              Envío individual a cada persona seleccionada:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
                              {personasSeleccionadas.map(p => {
                                const enviado = enviadosWhatsApp[p.id];
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleEnviarWhatsAppA(p.telefono, p.id)}
                                    className="btn btn-sm"
                                    style={{
                                      background: enviado ? '#15803d' : '#25D366',
                                      color: enviado ? '#fff' : '#000',
                                      fontWeight: 700,
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '6px 10px',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    <span>📲 {p.nombre} {p.apellido}</span>
                                    <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>
                                      {enviado ? '✓ Abierto' : p.telefono || 'Sin tel.'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {personasSeleccionadas.length === 0 && telefonoManual && (
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsAppA(telefonoManual, 'manual')}
                            className="btn"
                            style={{
                              height: '42px',
                              background: '#25D366',
                              color: '#000',
                              fontWeight: 800,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '0.82rem'
                            }}
                          >
                            <span>📲</span>
                            <span>Enviar WhatsApp al número manual ({telefonoManual})</span>
                          </button>
                        )}

                        {personasSeleccionadas.length === 0 && !telefonoManual && (
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsAppA('')}
                            className="btn"
                            style={{
                              height: '40px',
                              background: '#25D366',
                              color: '#000',
                              fontWeight: 800,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '0.82rem'
                            }}
                          >
                            <span>📲</span>
                            <span>Enviar por WhatsApp (Abrir sin destinatario fijo)</span>
                          </button>
                        )}
                      </div>

                      {/* Botones Complementarios: Correo y Copiar */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleEnviarEmail}
                          className="btn btn-ghost"
                          style={{
                            flex: 1,
                            minWidth: '180px',
                            height: '38px',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.78rem'
                          }}
                        >
                          <span>✉️</span>
                          <span>Enviar Correo ({emailsSeleccionados.length} destinatarios)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopiarMensaje}
                          className="btn btn-ghost"
                          style={{
                            flex: 1,
                            minWidth: '160px',
                            height: '38px',
                            border: '1px solid var(--border)',
                            color: copiado ? '#25D366' : 'var(--text-secondary)',
                            fontWeight: 700,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.78rem'
                          }}
                        >
                          <span>{copiado ? '✓' : '📋'}</span>
                          <span>{copiado ? 'Copiado al Portapapeles' : 'Copiar Texto del Reporte'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Previsualización del Resumen */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Vista Previa del Texto de Notificación
                      </div>
                      <pre style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '120px', overflowY: 'auto' }}>
                        {buildMensajeWhatsApp()}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pie de Acciones */}
          <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-modal)', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Orientación PDF: <strong style={{ color: 'var(--text-primary)' }}>{orientacion === 'landscape' ? '↔️ Horizontal (Recomendada)' : '↕️ Vertical'}</strong>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cerrar
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDescargarPDF}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
              >
                <span>📄</span>
                <span>Descargar PDF Carta</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
