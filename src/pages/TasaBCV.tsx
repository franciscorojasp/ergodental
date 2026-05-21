// src/pages/TasaBCV.tsx
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
    <div className="tasa-page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Tasa BCV</h1>
          <p>Consola de Gestión y Tendencia Cambiaria</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handlePDF}>📄 Exportar Reporte</button>
      </div>

      {/* DASHBOARD GRID SYSTEM */}
      <div className="tasa-layout-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* LEFT COMPONENT: HERO HUB (CURRENT RATE + SPARKLINE) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="glass premium-card" 
          style={{ 
            gridColumn: 'span 2', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '220px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                  💰 Tasa Oficial Hoy
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  <span style={{ fontSize: '1.2rem', opacity: 0.5, marginRight: '8px' }}>Bs</span>
                  {tasaBCV > 0 ? tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '0,00'}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  background: variacion > 0 ? 'var(--danger-dim)' : 'var(--success-dim)',
                  color: variacion > 0 ? 'var(--danger)' : 'var(--success)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700 }}>
                  VS. CIERRE AYER
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Sparkline */}
          <div style={{ marginTop: '20px', width: '100%', opacity: 0.8 }}>
            <TrendChart tasas={histFiltrado.map(t=>t.tasa).reverse()} height={80} />
          </div>

          <div style={{ 
            position: 'absolute', top: '-10px', right: '-10px', 
            fontSize: '8rem', opacity: 0.03, pointerEvents: 'none',
            fontWeight: 900
          }}>
            $
          </div>
        </motion.div>

        {/* RIGHT COMPONENT: ACTION WIDGET (UPDATE FORM) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="glass action-card" 
          style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {necesitaTasa ? '⚠️ Acción Requerida' : '✏️ Ajuste de Tasa'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
            La tasa oficial se actualiza <strong>automáticamente</strong>. Utilice este panel solo si requiere realizar un ajuste manual.
          </p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
               <input
                type="number" step="0.01"
                className="input"
                placeholder="Ex: 47,85"
                value={nuevaTasa}
                onChange={e => setNuevaTasa(e.target.value)}
                style={{ paddingLeft: '12px', height: '44px', fontWeight: 800 }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleActualizar}
              disabled={guardando || !nuevaTasa}
              style={{ minWidth: '44px', height: '44px', padding: 0 }}
              title="Guardar Tasa"
            >
              {guardando ? '...' : '✓'}
            </button>
          </div>
          {guardado && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginTop: '12px', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800 }}>
              ✓ Actualizado con éxito
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* SECONDARY STATS GRID: High-Density Symmetry */}
      <div className="stats-hub-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Mínimo Mensual', value: `Bs ${minTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`, icon: '📉', color: 'var(--success)' },
          { label: 'Máximo Mensual', value: `Bs ${maxTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`, icon: '📈', color: 'var(--danger)' },
          { label: 'Días Registrados', value: histFiltrado.length, icon: '📅', color: 'var(--accent)' },
          { label: 'Estabilidad', value: Math.abs(variacion) < 0.5 ? 'Alta' : 'Volátil', icon: '⚖️', color: 'var(--primary)' }
        ].map((s, i) => (
          <motion.div 
            key={s.label} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass" 
            style={{ 
              padding: '16px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px' 
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {s.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FILTER & HISTORY SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Historial de Movimientos</h2>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
          {([7, 30, 90] as const).map(d => (
            <button 
              key={d} 
              onClick={() => setFiltro(d)} 
              style={{
                fontSize: '0.7rem', padding: '6px 12px', border: 'none', borderRadius: '7px', cursor: 'pointer',
                background: filtro === d ? 'var(--primary)' : 'transparent',
                color: filtro === d ? '#000' : 'var(--text-secondary)',
                fontWeight: 800, transition: '0.2s'
              }}
            >
              {d} Días
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {!histFiltrado.length ? (
           <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
              <p>Esperando datos oficiales...</p>
           </div>
        ) : (
          <div className="table-wrap tasa-history-box">
            <table className="table-fixed">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Fecha de Publicación</th>
                  <th style={{ width: '30%' }}>Valor Bs/$1</th>
                  <th style={{ width: '15%' }} className="hide-mobile">Origen</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Dinámica</th>
                </tr>
              </thead>
              <tbody>
                {histFiltrado.map((item, i) => {
                  const prev = histFiltrado[i + 1];
                  const varPct = prev ? ((item.tasa - prev.tasa) / prev.tasa * 100) : null;
                  return (
                    <motion.tr key={item.fecha} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td style={{ fontWeight: 800 }}>
                        {item.fecha}
                        {i === 0 && <span style={{ marginLeft: '10px', fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '6px', verticalAlign: 'middle' }}>ACTUAL</span>}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 900 }}>
                        Bs {item.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="hide-mobile" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {item.fuente}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: !varPct ? 'var(--text-muted)' : (varPct > 0 ? 'var(--danger)' : 'var(--success)') }}>
                        {varPct ? `${varPct > 0 ? '▲' : '▼'} ${Math.abs(varPct).toFixed(2)}%` : '—'}
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

function TrendChart({ tasas, height = 80 }: { tasas: number[], height?: number }) {
  if (tasas.length < 2) return null;
  const W = 1000, H = height, pad = 5;
  const min = Math.min(...tasas);
  const max = Math.max(...tasas);
  const range = max - min || 1;
  
  const pts = tasas.map((t, i) => {
    const x = (i / (tasas.length - 1)) * W;
    const y = H - pad - ((t - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const areaPts = `0,${H} ${pts.join(' ')} ${W},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${areaPts}`} fill="url(#glow)" />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx={W} cy={pts[pts.length-1].split(',')[1]} r="4" fill="var(--primary)" />
    </svg>
  );
}
