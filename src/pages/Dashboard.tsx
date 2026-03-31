// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useMoneda } from '../contexts/MonedaContext';
import { getCitas, getPacientes, getPersonal, getPagos, type Cita, type Pago, IS_DEMO_MODE } from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import { generarReportePDF } from '../utils/reportes';

type Periodo = 'Hoy' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
const PERIODOS: Periodo[] = ['Hoy', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual'];
const DIAS: Record<Periodo, number> = {
  Hoy:0, Semanal:7, Quincenal:15, Mensual:30, Trimestral:90, Semestral:180, Anual:365,
};

export default function Dashboard() {
  const { user }  = useAuth();
  const { fmt }   = useMoneda();
  const { clinica } = useClinica();

  const [citas,       setCitas]       = useState<Cita[]>([]);
  const [pagos,       setPagos]       = useState<Pago[]>([]);
  const [totalPac,    setTotalPac]    = useState(0);
  const [totalPers,   setTotalPers]   = useState(0);
  const [periodo,     setPeriodo]     = useState<Periodo>('Mensual');

  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getCitas().then(data => setCitas(data.filter(c => clinica.id === 'consolidado' || c.clinicaId === clinica.id)));
    getPacientes().then(data => setTotalPac(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id).length));
    getPersonal().then(data => setTotalPers(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id).length));
    getPagos().then(data => setPagos(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
  }, [clinica.id]);

  const parseDateSafe = (f: string) => {
    if (!f) return new Date();
    const clean = String(f).split('T')[0];
    const d = new Date(clean + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const isInPeriodo = (fecha: string): boolean => {
    if (periodo === 'Hoy') return String(fecha).split('T')[0] === hoy;
    const dateCita = parseDateSafe(fecha);
    const dateHoy = new Date(hoy + 'T12:00:00');
    const diff = Math.abs((dateHoy.getTime() - dateCita.getTime()) / 86400000);
    return diff <= DIAS[periodo];
  };

  const citasHoy       = citas.filter(c => String(c.fecha).split('T')[0] === hoy);
  const citasPeriodo   = useMemo(() => citas.filter(c => isInPeriodo(c.fecha)), [citas, periodo, hoy]);
  const pagosPeriodo   = useMemo(() => pagos.filter(p => isInPeriodo(p.fecha) && (p.estado==='Pagado'||p.estado==='Parcial')), [pagos, periodo, hoy]);
  const ingresosPeriodo = pagosPeriodo.reduce((s,p) => s+p.monto, 0);
  const pendientesPeriodo = citasPeriodo.filter(c => c.estado==='Pendiente').length;

  const estadoColor: Record<string,string> = {
    Pendiente:'var(--warning)', Confirmada:'var(--primary)', Completada:'var(--success)', Cancelada:'var(--danger)',
  };

  const generarPDF = async () => {
    await generarReportePDF({
      titulo: `Resumen Ejecutivo`,
      clinica: clinica.nombre,
      subtitulo: `Periodo: ${periodo} · Generado: ${new Date().toLocaleString('es-VE')}`,
      usuario: user?.nombre,
      columnas: ['Métrica', 'Valor'],
      filas: [
        ['Total Pacientes', totalPac],
        [`Citas (${periodo})`, citasPeriodo.length],
        [`Citas Pendientes (${periodo})`, pendientesPeriodo],
        [`Ingresos (${periodo})`, fmt(ingresosPeriodo)],
        ['Personal activo', totalPers],
        ['Citas de hoy', citasHoy.length],
      ],
      totales: [
        { label:`Ingresos ${periodo}:`, valor: fmt(ingresosPeriodo) },
      ],
      notas: [`Fuente de datos: ${IS_DEMO_MODE ? 'Ergodental Local (Demo)' : 'Ergodental Cloud (Producción)'} · Periodo seleccionado: ${periodo}`],
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header Level World-Class */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Resumen Ejecutivo</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--primary)' }}>●</span>
            Sistema en Línea · <span style={{ fontWeight: 700 }}>{new Date().toLocaleDateString('es-VE', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span>
          </p>
        </div>
        <div className="action-grid">
          <div style={{ position: 'relative' }}>
             <select
              className="input"
              value={periodo}
              onChange={e => setPeriodo(e.target.value as Periodo)}
              style={{ padding:'10px 40px 10px 16px', fontSize:'0.88rem', minWidth:'160px', appearance: 'none', background: 'rgba(255,255,255,0.05)' }}
            >
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>▼</div>
          </div>
          
          <button className="btn btn-primary" onClick={generarPDF}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span>Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* High-End Stats Grid */}
      <div className="grid-responsive">
        {[
          { label:'Total Pacientes',        value: totalPac,                        icon:'🦷', color:'var(--primary)' },
          { label:`Citas (${periodo})`,    value: citasPeriodo.length,             icon:'📅', color:'var(--accent)' },
          { label:`Pendientes`,             value: pendientesPeriodo,               icon:'⏳', color:'var(--warning)' },
          { label:'Personal Activo',       value: totalPers,                        icon:'👨‍⚕️', color:'var(--success)' },
          { label:`Ingresos (${periodo})`, value: fmt(ingresosPeriodo, 0),         icon:'💰', color:'var(--success)' },
        ].map((s,i) => (
          <motion.div 
            key={s.label} 
            className="stat-card" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1, type: 'spring' }}
          >
            <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.05)', color: s.color }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Insights Section */}
      <div className="grid-responsive" style={{ marginTop:'48px' }}>
        {/* Citas de hoy */}
        <motion.div 
          className="glass" 
          style={{ padding: '32px', position: 'relative', overflow: 'hidden' }} 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.4 }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />
          <h3 style={{ fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
             Agenda del Día
            <span className="badge" style={{ marginLeft: 'auto', background: 'var(--primary-dim)', color: 'var(--primary)' }}>
              {citasHoy.length} Citas
            </span>
          </h3>

          {citasHoy.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>☕</div>
              <p style={{ fontWeight: 600 }}>Sin citas programadas para hoy</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {citasHoy.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px', borderRadius: '18px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                  transition: '0.3s'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', minWidth: '55px' }}>{c.hora}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{c.pacienteNombre}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.motivo}</div>
                  </div>
                  <span className="badge" style={{
                    background: `color-mix(in srgb, ${estadoColor[c.estado]} 10%, transparent)`,
                    color: estadoColor[c.estado],
                    border: `1px solid color-mix(in srgb, ${estadoColor[c.estado]} 25%, transparent)`,
                  }}>{c.estado}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Próximas citas */}
        <motion.div 
          className="glass" 
          style={{ padding: '32px', position: 'relative', overflow: 'hidden' }} 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.5 }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)' }} />
          <h3 style={{ fontWeight: 900, marginBottom: '24px', fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
            Próximos Pacientes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {citas.filter(c => String(c.fecha).split('T')[0] > hoy).slice(0, 5).map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px', borderRadius: '18px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              }}>
                <div style={{ 
                  textAlign: 'center', minWidth: '50px', padding: '8px', 
                  background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-light)' 
                }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                    {parseDateSafe(c.fecha).toLocaleDateString('es-VE', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                    {parseDateSafe(c.fecha).getDate()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{c.pacienteNombre}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.hora} · {c.doctorNombre}</div>
                </div>
                {c.tipoReferencia && (
                  <div style={{ fontSize: '1.2rem', opacity: 0.7 }}>
                     {c.tipoReferencia==='Foraneo-30'||c.tipoReferencia==='Foraneo-10'?'🌍':''}
                     {c.tipoReferencia==='Profesional-Especialista'?'👨‍⚕️':''}
                     {c.tipoReferencia==='Paciente-Clinica'?'🏥':''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
