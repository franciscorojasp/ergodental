// src/pages/TasaBCV.tsx
// Historial de tasas BCV con mini-gráfica de tendencia
// + formulario para actualizar la tasa del día manualmente
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';
import { generarReportePDF } from '../utils/reportes';
import { useAuth } from '../contexts/AuthContext';

export default function TasaBCV() {
  const { tasaBCV, historialTasas, necesitaTasa, guardarTasaManual } = useMoneda();
  const { user } = useAuth();
  const [filtro, setFiltro] = useState<7 | 30 | 90>(30);
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);

  const histFiltrado = historialTasas.slice(0, filtro);
  const hoy    = histFiltrado[0];
  const ayer   = histFiltrado[1];
  const variacion = hoy && ayer ? ((hoy.tasa - ayer.tasa) / ayer.tasa * 100) : 0;
  const minTasa = histFiltrado.length > 0 ? Math.min(...histFiltrado.map(t => t.tasa)) : 0;
  const maxTasa = histFiltrado.length > 0 ? Math.max(...histFiltrado.map(t => t.tasa)) : 0;

  const handleActualizar = () => {
    const num = parseFloat(nuevaTasa.replace(',', '.'));
    if (!num || num <= 10) return;
    setGuardando(true);
    guardarTasaManual(num);
    setNuevaTasa('');
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const handlePDF = async () => {
    await generarReportePDF({
      titulo: 'Historial de Tasa BCV',
      clinica: 'Sistema Global (Consolidado)',
      subtitulo: `Últimos ${filtro} días · Tasa hoy: Bs ${tasaBCV > 0 ? tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'no registrada'} / $1`,
      usuario: user?.nombre,
      columnas: ['Fecha', 'Tasa (Bs/USD)', 'Fuente', 'Variación'],
      filas: histFiltrado.map((t, i) => {
        const prev = histFiltrado[i + 1];
        const var_ = prev ? ((t.tasa - prev.tasa) / prev.tasa * 100).toFixed(2) + '%' : '—';
        return [t.fecha, `Bs ${t.tasa.toLocaleString('es-VE', {maximumFractionDigits:0})}`, t.fuente, var_];
      }),
      totales: tasaBCV > 0 ? [
        { label: 'Tasa actual:', valor: `Bs ${tasaBCV.toLocaleString('es-VE', {maximumFractionDigits:0})}` },
        { label: 'Mín. período:', valor: `Bs ${minTasa.toLocaleString('es-VE', {maximumFractionDigits:0})}` },
        { label: 'Máx. período:', valor: `Bs ${maxTasa.toLocaleString('es-VE', {maximumFractionDigits:0})}` },
      ] : [],
      notas: ['Tasa ingresada manualmente según publicación oficial del BCV.', 'Fuente: bcv.org.ve o publicaciones oficiales del Banco Central de Venezuela.'],
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasa BCV</h1>
          <p>Historial de tasas · Actualización manual diaria</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handlePDF}>📄 PDF</button>
      </div>

      {/* Form para ingresar / actualizar tasa */}
      <motion.div className="glass" style={{ padding:'20px', marginBottom:'20px' }}
        initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <div style={{ fontWeight:700, marginBottom:'4px' }}>
          {necesitaTasa ? '⚠️ Ingresa la tasa BCV oficial de hoy' : '✏️ Actualizar tasa del día'}
        </div>
        <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:'14px' }}>
          Consulta la tasa oficial en{' '}
          <a href="https://www.bcv.org.ve" target="_blank" rel="noreferrer"
            style={{ color:'var(--primary)' }}>bcv.org.ve</a>
          {' '}e ingrésala aquí.
          {tasaBCV > 0 && <span style={{ marginLeft:'8px', color:'var(--accent)', fontWeight:600 }}>
            Tasa actual: Bs {tasaBCV.toLocaleString('es-VE', {maximumFractionDigits:2})} / $1
          </span>}
        </div>
        <div style={{ display:'flex', gap:'10px', maxWidth:'440px' }}>
          <div style={{ position:'relative', flex:1 }}>
            <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'0.9rem', fontWeight:800, color:'var(--primary)' }}>Bs</span>
            <input
              type="number" step="0.01" min="10"
              className="input"
              placeholder="Ej: 65890.25"
              value={nuevaTasa}
              onChange={e => setNuevaTasa(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleActualizar()}
              style={{ paddingLeft:'36px', fontWeight:700, fontSize:'1.05rem' }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleActualizar}
            disabled={guardando || !nuevaTasa}
            style={{ minWidth:'120px' }}
          >
            {guardado ? '✓ Guardado' : guardando ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
        {guardado && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
            style={{ marginTop:'10px', color:'var(--success)', fontSize:'0.84rem', fontWeight:600 }}>
            ✅ Tasa actualizada correctamente. Los montos en Bs ya reflejan la nueva tasa.
          </motion.div>
        )}
      </motion.div>

      {/* Stat cards */}
      {histFiltrado.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', marginBottom:'22px' }}>
          {[
            { label:'Tasa hoy',      value: tasaBCV > 0 ? `Bs ${tasaBCV.toLocaleString('es-VE',{maximumFractionDigits:0})}` : 'No ingresada', icon:'💱', color: tasaBCV > 0 ? 'var(--primary)' : 'var(--warning)' },
            { label:'Variación',     value:`${variacion >= 0 ? '+' : ''}${variacion.toFixed(2)}%`,  icon: variacion >= 0 ? '📈' : '📉', color: variacion >= 0 ? 'var(--danger)' : 'var(--success)' },
            { label:'Mín. período', value: minTasa > 0 ? `Bs ${minTasa.toLocaleString('es-VE',{maximumFractionDigits:0})}` : '—', icon:'⬇️', color:'var(--success)' },
            { label:'Máx. período', value: maxTasa > 0 ? `Bs ${maxTasa.toLocaleString('es-VE',{maximumFractionDigits:0})}` : '—', icon:'⬆️', color:'var(--danger)' },
            { label:'Registros',     value: String(histFiltrado.length), icon:'🗓️', color:'var(--accent)' },
          ].map((s,i) => (
            <motion.div key={s.label} className="stat-card" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}>
              <div className="stat-icon" style={{background:`color-mix(in srgb,${s.color} 15%,transparent)`}}>{s.icon}</div>
              <div className="stat-value" style={{color:s.color,fontSize:'1.15rem'}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtro de días */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
        {([7,30,90] as const).map(d => (
          <button key={d} onClick={() => setFiltro(d)} className="btn btn-ghost btn-sm"
            style={filtro===d ? {borderColor:'var(--primary)',color:'var(--primary)',background:'var(--primary-dim)'} : {}}>
            Últimos {d} días
          </button>
        ))}
      </div>

      {/* Mini gráfica sparkline SVG */}
      {histFiltrado.length > 1 && (
        <motion.div className="glass" style={{padding:'20px',marginBottom:'18px'}} initial={{opacity:0}} animate={{opacity:1}}>
          <div style={{fontWeight:700,marginBottom:'12px'}}>📊 Tendencia de la tasa</div>
          <TrendChart tasas={histFiltrado.map(t=>t.tasa).reverse()} />
        </motion.div>
      )}

      {/* Tabla de historial */}
      <motion.div className="glass" initial={{opacity:0}} animate={{opacity:1}}>
        {histFiltrado.length === 0 ? (
          <div style={{textAlign:'center',padding:'50px',color:'var(--text-muted)'}}>
            <div style={{fontSize:'2.5rem',marginBottom:'12px'}}>💱</div>
            <div style={{fontWeight:700,marginBottom:'6px'}}>No hay historial aún</div>
            <div style={{fontSize:'0.85rem'}}>Ingresa la tasa del día en el formulario de arriba para comenzar.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tasa (Bs/$1 USD)</th><th>Fuente</th><th>Variación vs día anterior</th></tr></thead>
              <tbody>
                {histFiltrado.map((item, i) => {
                  const prev = histFiltrado[i + 1];
                  const varPct = prev ? ((item.tasa - prev.tasa) / prev.tasa * 100) : null;
                  return (
                    <motion.tr key={item.fecha} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}>
                      <td style={{fontWeight:i===0?700:400}}>
                        {item.fecha}
                        {i===0 && <span style={{marginLeft:'6px',fontSize:'0.72rem',background:'var(--primary)',color:'#fff',borderRadius:'4px',padding:'1px 5px'}}>HOY</span>}
                      </td>
                      <td style={{fontWeight:700, color:'var(--primary)', fontSize:'0.95rem'}}>
                        Bs {item.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`badge ${item.fuente==='Manual'?'badge-success':'badge-muted'}`}>{item.fuente}</span>
                      </td>
                      <td>
                        {varPct !== null ? (
                          <span style={{color: varPct > 0 ? 'var(--danger)' : varPct < 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight:600}}>
                            {varPct > 0 ? '▲' : varPct < 0 ? '▼' : '—'} {Math.abs(varPct).toFixed(2)}%
                          </span>
                        ) : '—'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TrendChart({ tasas }: { tasas: number[] }) {
  if (tasas.length < 2) return null;
  const W = 600, H = 80, pad = 10;
  const min = Math.min(...tasas) * 0.999;
  const max = Math.max(...tasas) * 1.001;
  const pts = tasas.map((t, i) => {
    const x = pad + (i / (tasas.length - 1)) * (W - pad * 2);
    const y = H - pad - ((t - min) / (max - min)) * (H - pad * 2);
    return `${x},${y}`;
  });
  const lastPt  = pts[pts.length - 1].split(',');
  const firstPt = pts[0].split(',');
  const area = `${pts.join(' ')} ${lastPt[0]},${H - pad} ${firstPt[0]},${H - pad}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:80 }}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e5ab4" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#1e5ab4" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#tg)"/>
      <polyline points={pts.join(' ')} fill="none" stroke="#1e5ab4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#00d28c"/>
    </svg>
  );
}
