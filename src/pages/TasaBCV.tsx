// src/pages/TasaBCV.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';
import { generarReportePDF } from '../utils/reportes';
import { useAuth } from '../contexts/AuthContext';

export default function TasaBCV() {
  const {
    tasaBCV,
    tasaEuroBCV,
    fechaTasaBCV,
    ultimaActualizacion,
    actualizandoTasas,
    actualizarTasasAuto,
    historialTasas,
    guardarTasaManual
  } = useMoneda();

  const { user } = useAuth();
  const [filtro, setFiltro] = useState<7 | 30 | 90>(30);
  const [nuevaTasaDolar, setNuevaTasaDolar] = useState('');
  const [nuevaTasaEuro, setNuevaTasaEuro] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);

  const histFiltrado = historialTasas.slice(0, filtro);
  const hoy = histFiltrado[0];
  const ayer = histFiltrado[1];
  const variacion = hoy && ayer ? ((hoy.tasa - ayer.tasa) / ayer.tasa * 100) : 0;
  const minTasa = histFiltrado.length > 0 ? Math.min(...histFiltrado.map(t => t.tasa)) : 0;
  const maxTasa = histFiltrado.length > 0 ? Math.max(...histFiltrado.map(t => t.tasa)) : 0;

  // Paridad EUR/USD calculada
  const tasaEuroEfectiva = tasaEuroBCV > 0 ? tasaEuroBCV : Number((tasaBCV * 1.1226).toFixed(4));
  const ratioEurUsd = tasaBCV > 0 ? (tasaEuroEfectiva / tasaBCV).toFixed(4) : '1.1226';

  const handleSyncEnVivo = async () => {
    setMensajeSync(null);
    const res = await actualizarTasasAuto(true);
    if (res && res.dolar > 0) {
      setMensajeSync(`¡Tasas actualizadas en vivo! Dólar: Bs ${res.dolar.toLocaleString('es-VE', { minimumFractionDigits: 2 })} · Euro: Bs ${res.euro.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
      setTimeout(() => setMensajeSync(null), 4500);
    } else {
      setMensajeSync('No se pudo conectar con el servidor BCV en este momento. Se mantiene la última tasa registrada.');
      setTimeout(() => setMensajeSync(null), 4500);
    }
  };

  const handleGuardarManual = async () => {
    const numDolar = parseFloat(nuevaTasaDolar.replace(',', '.'));
    const numEuro = parseFloat(nuevaTasaEuro.replace(',', '.'));
    if (!numDolar || numDolar <= 10) return;

    setGuardando(true);
    await guardarTasaManual(numDolar, numEuro > 10 ? numEuro : undefined);
    setNuevaTasaDolar('');
    setNuevaTasaEuro('');
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const handlePDF = async () => {
    await generarReportePDF({
      titulo: 'Historial de Tasas Oficiales BCV (Dólar y Euro)',
      clinica: 'Sistema Global (Consolidado)',
      subtitulo: `Últimos ${filtro} días · Dólar: Bs ${tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / $1 · Euro: Bs ${tasaEuroEfectiva.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / €1`,
      usuario: user?.nombre,
      columnas: ['Fecha', 'Dólar BCV (Bs)', 'Euro BCV (Bs)', 'Fuente', 'Variación'],
      filas: histFiltrado.map((t, i) => {
        const prev = histFiltrado[i + 1];
        const var_ = prev ? ((t.tasa - prev.tasa) / prev.tasa * 100).toFixed(2) + '%' : '—';
        const euroFila = t.tasaEuro ? `Bs ${t.tasaEuro.toLocaleString('es-VE', { maximumFractionDigits: 2 })}` : `Bs ${(t.tasa * 1.1226).toFixed(2)}`;
        return [
          t.fecha,
          `Bs ${t.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          euroFila,
          t.fuente,
          var_
        ];
      }),
      totales: [
        { label: 'Dólar Oficial Hoy:', valor: `Bs ${tasaBCV.toLocaleString('es-VE', { maximumFractionDigits: 2 })}` },
        { label: 'Euro Oficial Hoy:', valor: `Bs ${tasaEuroEfectiva.toLocaleString('es-VE', { maximumFractionDigits: 2 })}` },
        { label: 'Mínimo Período (USD):', valor: `Bs ${minTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}` },
        { label: 'Máximo Período (USD):', valor: `Bs ${maxTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}` },
      ],
      notas: [
        'Tasas oficiales publicadas por el Banco Central de Venezuela (bcv.org.ve).',
        'Actualización automática diaria sincronizada por el sistema clínico ErgoDentalVE.'
      ],
    });
  };

  return (
    <div className="tasa-page-container">
      {/* HEADER DE LA PÁGINA */}
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>💱</span>
            <span>Tasas Oficiales BCV</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
            Consola oficial de cambio de divisas del Banco Central de Venezuela (Dólar $ y Euro €)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSyncEnVivo}
            disabled={actualizandoTasas}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
          >
            <span style={{ display: 'inline-block', animation: actualizandoTasas ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            <span>{actualizandoTasas ? 'Sincronizando...' : 'Actualizar Tasas BCV'}</span>
          </button>

          <button className="btn btn-ghost btn-sm" onClick={handlePDF}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SINCRONIZACIÓN EN VIVO */}
      {mensajeSync && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(0, 212, 255, 0.12)',
            border: '1px solid var(--primary)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>ℹ️</span>
          <span>{mensajeSync}</span>
        </motion.div>
      )}

      {/* BARRA DE ESTADO OFICIAL */}
      <div
        className="glass"
        style={{
          padding: '10px 16px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.78rem',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', boxShadow: '0 0 8px #25D366' }} />
          <strong style={{ color: 'var(--text-primary)' }}>Sincronización Automática Diaria Activa</strong>
          <span style={{ color: 'var(--text-muted)' }}>· Banco Central de Venezuela</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
          {fechaTasaBCV && (
            <span>📅 Fecha BCV: <strong style={{ color: '#fff' }}>{fechaTasaBCV.split('T')[0]}</strong></span>
          )}
          {ultimaActualizacion && (
            <span>⏰ Última consulta: <strong style={{ color: 'var(--primary)' }}>{ultimaActualizacion}</strong></span>
          )}
        </div>
      </div>

      {/* DUAL HERO GRID: DÓLAR Y EURO OFICIALES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}
      >
        {/* TARJETA 1: DÓLAR BCV OFICIAL */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass premium-card"
          style={{
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(0, 212, 255, 0.25)',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(8, 14, 34, 0.5))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🇺🇸</span>
                <span>Dólar Oficial BCV (USD)</span>
              </div>
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                <span style={{ fontSize: '1.2rem', opacity: 0.5, marginRight: '8px' }}>Bs</span>
                {tasaBCV > 0 ? tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Moneda base para cálculos clínicos y presupuestos
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: variacion > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: variacion > 0 ? '#ef4444' : '#10b981',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700 }}>
                VS. CIERRE ANTERIOR
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', width: '100%', opacity: 0.75 }}>
            <TrendChart tasas={histFiltrado.map(t => t.tasa).reverse()} height={70} color="var(--primary)" />
          </div>
        </motion.div>

        {/* TARJETA 2: EURO BCV OFICIAL */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass premium-card"
          style={{
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(8, 14, 34, 0.5))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🇪🇺</span>
                <span>Euro Oficial BCV (EUR)</span>
              </div>
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                <span style={{ fontSize: '1.2rem', opacity: 0.5, marginRight: '8px' }}>Bs</span>
                {tasaEuroEfectiva.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Paridad cambiaria oficial: <strong>1 EUR ≈ {ratioEurUsd} USD</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                1 € = {ratioEurUsd} $
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700 }}>
                PARIDAD BCV
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', width: '100%', opacity: 0.75 }}>
            <TrendChart
              tasas={histFiltrado.map(t => t.tasaEuro || Number((t.tasa * 1.1226).toFixed(2))).reverse()}
              height={70}
              color="#10b981"
            />
          </div>
        </motion.div>
      </div>

      {/* PANEL DE AJUSTE MANUAL (OPCIONAL / EXCEPCIONES) */}
      <div
        className="glass"
        style={{
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '28px',
          border: '1px solid var(--border-light)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            ✏️ Ajuste Manual de Tasas (Opcional)
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Solo requerido ante caídas del servicio BCV o tasas corporativas fijadas
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Dólar ($ USD en Bs):
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-sm"
              placeholder={tasaBCV ? String(tasaBCV) : 'Ej: 884.75'}
              value={nuevaTasaDolar}
              onChange={e => setNuevaTasaDolar(e.target.value)}
              style={{ width: '100%', height: '38px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Euro (€ EUR en Bs, Opcional):
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-sm"
              placeholder={tasaEuroEfectiva ? String(tasaEuroEfectiva) : 'Ej: 993.21'}
              value={nuevaTasaEuro}
              onChange={e => setNuevaTasaEuro(e.target.value)}
              style={{ width: '100%', height: '38px', fontWeight: 700 }}
            />
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGuardarManual}
              disabled={guardando || !nuevaTasaDolar}
              style={{ width: '100%', height: '38px', fontWeight: 800, fontSize: '0.8rem' }}
            >
              {guardando ? 'Guardando...' : '💾 Guardar Tasas Manuales'}
            </button>
          </div>
        </div>

        {guardado && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '8px', color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>
            ✓ Tasas sincronizadas exitosamente en el sistema
          </motion.div>
        )}
      </div>

      {/* STATS RÁPIDOS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '28px'
        }}
      >
        {[
          { label: 'Mínimo Dólar (Período)', value: `Bs ${minTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`, icon: '📉', color: '#10b981' },
          { label: 'Máximo Dólar (Período)', value: `Bs ${maxTasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`, icon: '📈', color: '#ef4444' },
          { label: 'Equivalente Euro Oficial', value: `Bs ${tasaEuroEfectiva.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`, icon: '💶', color: '#00d4ff' },
          { label: 'Días con Registro', value: `${histFiltrado.length} días`, icon: '📅', color: '#a855f7' }
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLA DE HISTORIAL DE MOVIMIENTOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Historial de Tasas Diarias</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {([7, 30, 90] as const).map(n => (
            <button
              key={n}
              onClick={() => setFiltro(n)}
              className={`btn btn-sm ${filtro === n ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem', height: '30px', padding: '0 10px' }}
            >
              {n} días
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-fixed" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Fecha</th>
              <th>Dólar BCV (USD)</th>
              <th>Euro BCV (EUR)</th>
              <th style={{ width: '130px' }}>Fuente</th>
              <th style={{ width: '120px' }} className="text-right">Variación</th>
            </tr>
          </thead>
          <tbody>
            {histFiltrado.map((item, i) => {
              const prev = histFiltrado[i + 1];
              const varPct = prev ? ((item.tasa - prev.tasa) / prev.tasa * 100) : null;
              const euroValor = item.tasaEuro || Number((item.tasa * 1.1226).toFixed(2));

              return (
                <tr key={item.fecha + i}>
                  <td style={{ fontWeight: 700 }}>{item.fecha}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 800 }}>
                    Bs {item.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 800 }}>
                    Bs {euroValor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                      {item.fuente}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: !varPct ? 'var(--text-muted)' : (varPct > 0 ? '#ef4444' : '#10b981') }}>
                    {varPct ? `${varPct > 0 ? '▲' : '▼'} ${Math.abs(varPct).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              );
            })}
            {histFiltrado.length === 0 && (
              <tr>
                <td colSpan={5} className="table-empty">No hay registros de tasas disponibles para este período</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ tasas, height = 70, color = 'var(--primary)' }: { tasas: number[]; height?: number; color?: string }) {
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
        <linearGradient id={`glow-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${areaPts}`} fill={`url(#glow-${color.replace(/[^a-zA-Z0-9]/g, '')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={W} cy={pts[pts.length - 1].split(',')[1]} r="4" fill={color} />
    </svg>
  );
}
