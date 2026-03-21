// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useMoneda } from '../contexts/MonedaContext';
import { getCitas, getPacientes, getPersonal, getPagos, type Cita, type Pago } from '../api';
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

  // Filtrar por periodo
  const isInPeriodo = (fecha: string): boolean => {
    if (periodo === 'Hoy') return fecha === hoy;
    const diff = Math.abs((new Date(hoy).getTime() - new Date(fecha).getTime()) / 86400000);
    return diff <= DIAS[periodo];
  };

  const citasHoy       = citas.filter(c => c.fecha === hoy);
  const citasPeriodo   = useMemo(() => citas.filter(c => isInPeriodo(c.fecha)), [citas, periodo, hoy]);
  const pagosPeriodo   = useMemo(() => pagos.filter(p => isInPeriodo(p.fecha) && (p.estado==='Pagado'||p.estado==='Parcial')), [pagos, periodo, hoy]);
  const ingresosPeriodo = pagosPeriodo.reduce((s,p) => s+p.monto, 0);
  const pendientesPeriodo = citasPeriodo.filter(c => c.estado==='Pendiente').length;

  // Estado colors
  const estadoColor: Record<string,string> = {
    Pendiente:'var(--warning)', Confirmada:'var(--primary)', Completada:'var(--success)', Cancelada:'var(--danger)',
  };

  // PDF
  const generarPDF = () => {
    generarReportePDF({
      titulo: `Resumen Ejecutivo – ${clinica.nombre}`,
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
      notas: [`Fuente de datos: Ergodental Demo · Periodo seleccionado: ${periodo}`],
    });
  };

  return (
    <div>
      {/* Header con selector de periodo como dropdown */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido, {user?.nombre} · {new Date().toLocaleDateString('es-VE', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <select
            className="input"
            value={periodo}
            onChange={e => setPeriodo(e.target.value as Periodo)}
            style={{ padding:'8px 14px', fontSize:'0.88rem', minWidth:'130px' }}
          >
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={generarPDF} title="Exportar PDF">
            📄 PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-responsive" style={{ marginBottom: '28px' }}>
        {[
          { label:'Pacientes',             value: totalPac,                        icon:'🦷', color:'var(--primary)' },
          { label:`Citas (${periodo})`,    value: citasPeriodo.length,             icon:'📅', color:'var(--accent)' },
          { label:`Pendientes (${periodo})`,value:pendientesPeriodo,               icon:'⏳', color:'var(--warning)' },
          { label:'Personal activo',        value: totalPers,                        icon:'👨‍⚕️', color:'var(--success)' },
          { label:`Ingresos (${periodo})`, value: fmt(ingresosPeriodo, 0),         icon:'💰', color:'var(--success)' },
        ].map((s,i) => (
          <motion.div key={s.label} className="stat-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.09}}>
            <div className="stat-icon" style={{background:`color-mix(in srgb,${s.color} 15%,transparent)`}}>{s.icon}</div>
            <div className="stat-value" style={{color:s.color,fontSize:'clamp(1.2rem, 4vw, 1.8rem)'}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid-responsive">
        {/* Citas de hoy */}
        <motion.div className="glass" style={{padding:'24px'}} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}}>
          <h3 style={{fontWeight:700,marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
            📅 <span>Citas de Hoy</span>
            <span style={{marginLeft:'auto',fontSize:'0.78rem',color:'var(--text-muted)'}}>{citasHoy.length} citas</span>
          </h3>
          {citasHoy.length === 0 ? (
            <p style={{color:'var(--text-muted)',fontSize:'0.88rem',padding:'20px 0',textAlign:'center'}}>No hay citas programadas para hoy</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {citasHoy.map(c => (
                <div key={c.id} style={{
                  display:'flex',alignItems:'center',gap:'12px',
                  padding:'12px',borderRadius:'var(--radius-sm)',
                  background:'rgba(255,255,255,0.04)',border:'1px solid var(--border)',
                }}>
                  <div style={{fontSize:'0.8rem',fontWeight:700,color:'var(--primary)',minWidth:'42px'}}>{c.hora}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:'0.88rem'}}>{c.pacienteNombre}</div>
                    <div style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{c.motivo}</div>
                  </div>
                  <span className="badge" style={{
                    background:`color-mix(in srgb,${estadoColor[c.estado]} 15%,transparent)`,
                    color:estadoColor[c.estado],
                    border:`1px solid ${estadoColor[c.estado]}`,
                    fontSize:'0.68rem',
                  }}>{c.estado}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Próximas citas */}
        <motion.div className="glass" style={{padding:'24px'}} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
          <h3 style={{fontWeight:700,marginBottom:'16px'}}>📋 Próximas Citas</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {citas.filter(c => c.fecha > hoy).slice(0,5).map(c => (
              <div key={c.id} style={{
                display:'flex',alignItems:'center',gap:'12px',
                padding:'12px',borderRadius:'var(--radius-sm)',
                background:'rgba(255,255,255,0.04)',border:'1px solid var(--border)',
              }}>
                <div style={{textAlign:'center',minWidth:'44px'}}>
                  <div style={{fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase'}}>
                    {new Date(c.fecha+'T12:00:00').toLocaleDateString('es-VE',{month:'short'})}
                  </div>
                  <div style={{fontSize:'1.1rem',fontWeight:800,color:'var(--primary)',lineHeight:1}}>
                    {new Date(c.fecha+'T12:00:00').getDate()}
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'0.88rem'}}>{c.pacienteNombre}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{c.hora} · {c.doctorNombre}</div>
                </div>
                {c.tipoReferencia && (
                  <div style={{fontSize:'0.72rem',color:'var(--accent)',whiteSpace:'nowrap'}}>
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
