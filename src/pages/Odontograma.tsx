import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPacientes, getOdontograma, saveOdontograma, type Paciente } from '../api';
import { useClinica } from '../contexts/ClinicaContext';

type EstadoPieza = 'sano' | 'caries' | 'corona' | 'extraccion' | 'endodoncia' | 'implante' | 'ausente';

interface Pieza { numero: number; estado: EstadoPieza; notas: string; }

const ESTADOS: { key: EstadoPieza; label: string; color: string; emoji: string }[] = [
  { key: 'sano',       label: 'Sano',       color: '#00e096', emoji: '✅' },
  { key: 'caries',     label: 'Caries',     color: '#ff4d6a', emoji: '🔴' },
  { key: 'corona',     label: 'Corona',     color: '#7b61ff', emoji: '👑' },
  { key: 'extraccion', label: 'Extracción', color: '#ff7849', emoji: '❌' },
  { key: 'endodoncia', label: 'Endodoncia', color: '#ffb224', emoji: '🔧' },
  { key: 'implante',   label: 'Implante',   color: '#00c6ff', emoji: '🔩' },
  { key: 'ausente',    label: 'Ausente',    color: '#4a5a7a', emoji: '⬜' },
];

const SUPERIOR = Array.from({ length: 16 }, (_, i) => i + 1);
const INFERIOR = Array.from({ length: 16 }, (_, i) => i + 17);

function initPiezas(): Pieza[] {
  return Array.from({ length: 32 }, (_, i) => ({ numero: i + 1, estado: 'sano', notas: '' }));
}

export default function Odontograma() {
  const { clinica } = useClinica();
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [piezas, setPiezas] = useState<Pieza[]>(initPiezas);
  const [selected, setSelected] = useState<number | null>(null);
  const [herramienta, setHerramienta] = useState<EstadoPieza>('caries');
  const [pacienteId, setPacienteId] = useState(searchParams.get('pacienteId') || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getPacientes().then(data => {
      if (Array.isArray(data)) {
        setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id));
      }
    });
  }, [clinica.id]);

  const loadOdontograma = useCallback(async (id: string) => {
    if (!id) { setPiezas(initPiezas()); return; }
    setLoading(true);
    try {
      const data = await getOdontograma(id);
      if (data && data.piezas) setPiezas(data.piezas);
      else setPiezas(initPiezas());
    } catch (e) {
      setPiezas(initPiezas());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadOdontograma(pacienteId);
  }, [pacienteId, loadOdontograma]);

  const handleSave = async () => {
    if (!pacienteId) { alert('Selecciona un paciente primero'); return; }
    setSaving(true);
    try {
      await saveOdontograma({ pacienteId, piezas });
      alert('¡Odontograma guardado con éxito!');
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    } finally { setSaving(false); }
  };

  const estadoInfo = (e: EstadoPieza) => ESTADOS.find(x => x.key === e) || ESTADOS[0];

  const handlePieza = (num: number) => {
    setPiezas(prev => prev.map(p => p.numero === num ? { ...p, estado: herramienta } : p));
    setSelected(num);
  };

  const pieza = useMemo(() => piezas.find(p => p.numero === selected), [piezas, selected]);

  const updateNota = (nota: string) => {
    if (!selected) return;
    setPiezas(prev => prev.map(p => p.numero === selected ? { ...p, notas: nota } : p));
  };

  const resumen = useMemo(() => 
    ESTADOS.map(e => ({ ...e, count: piezas.filter(p => p.estado === e.key).length }))
           .filter(e => e.count > 0), 
  [piezas]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Odontograma</h1>
          <p>Mapa clínico dental interactivo</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
          <select className="input" value={pacienteId} onChange={e => setPacienteId(e.target.value)} style={{ width: isMobile ? '100%' : '240px' }}>
            <option value="">Seleccionar paciente...</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} {p.apellido} - {p.cedula}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => confirm('¿Reiniciar mapa?') && setPiezas(initPiezas())}>↺</button>
        </div>
      </div>

      {!pacienteId ? (
        <div className="glass" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🦷</div>
          <h2>Esperando selección de paciente</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Por favor, utiliza el buscador de arriba para cargar el historial dental de un paciente.</p>
        </div>
      ) : (
        <>
          {loading && <div style={{ marginBottom: 20, color: 'var(--primary)', textAlign:'center' }}>Cargando datos históricos...</div>}
          
          <div className="glass" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Herramienta Activa</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ESTADOS.map(e => (
                <button key={e.key} onClick={() => setHerramienta(e.key)} className="btn btn-ghost btn-sm"
                  style={herramienta === e.key ? { borderColor: e.color, color: e.color, background: `color-mix(in srgb, ${e.color} 15%, transparent)` } : {}}>
                  {e.emoji} {isMobile ? '' : e.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '20px' }}>
            <div className="glass" style={{ padding: isMobile ? '15px' : '30px' }}>
              <h4 style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>↑ MAXILAR SUPERIOR ↑</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', marginBottom: '30px' }}>
                {SUPERIOR.map(n => {
                  const p = piezas.find(x => x.numero === n) || { numero: n, estado: 'sano', notas: '' };
                  const info = estadoInfo(p.estado);
                  return (
                    <motion.button key={n} onClick={() => handlePieza(n)} whileTap={{ scale: 0.9 }}
                      style={{
                        width: isMobile ? 36 : 42, height: isMobile ? 40 : 46,
                        borderRadius: '10px 10px 4px 4px',
                        border: selected === n ? `2px solid ${info.color}` : '1px solid var(--border)',
                        background: selected === n ? `${info.color}33` : `${info.color}11`,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: selected === n ? `0 0 10px ${info.color}44` : 'none',
                        margin: 1
                      }}>
                      <span style={{ fontSize: isMobile ? '0.8rem' : '1.1rem' }}>{info.emoji}</span>
                      <span style={{ fontSize: '0.6rem', color: info.color, fontWeight: 800 }}>{n}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', margin: '30px 0', position: 'relative', textAlign: 'center' }}>
                <span style={{ background: 'var(--bg-dark)', padding: '0 10px', fontSize: '0.65rem', color: 'var(--text-muted)', position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)' }}>LÍNEA MEDIA</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', marginTop: '30px' }}>
                {INFERIOR.map(n => {
                  const p = piezas.find(x => x.numero === n) || { numero: n, estado: 'sano', notas: '' };
                  const info = estadoInfo(p.estado);
                  return (
                    <motion.button key={n} onClick={() => handlePieza(n)} whileTap={{ scale: 0.9 }}
                      style={{
                        width: isMobile ? 36 : 42, height: isMobile ? 40 : 46,
                        borderRadius: '4px 4px 10px 10px',
                        border: selected === n ? `2px solid ${info.color}` : '1px solid var(--border)',
                        background: selected === n ? `${info.color}33` : `${info.color}11`,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: selected === n ? `0 0 10px ${info.color}44` : 'none',
                        margin: 1
                      }}>
                      <span style={{ fontSize: '0.6rem', color: info.color, fontWeight: 800 }}>{n}</span>
                      <span style={{ fontSize: isMobile ? '0.8rem' : '1.1rem' }}>{info.emoji}</span>
                    </motion.button>
                  );
                })}
              </div>
              <h4 style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '20px' }}>↓ MAXILAR INFERIOR ↓</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '15px' }}>Detalles de Pieza</h3>
                {pieza ? (
                  <div className="input-group">
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:10 }}>
                      <div style={{ width:40, height:40, borderRadius:8, background:estadoInfo(pieza.estado).color+'22', border: `1px solid ${estadoInfo(pieza.estado).color}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:estadoInfo(pieza.estado).color }}>{pieza.numero}</div>
                      <span style={{ fontWeight:700 }}>{estadoInfo(pieza.estado).label}</span>
                    </div>
                    <textarea className="input" rows={4} value={pieza.notas} onChange={e => updateNota(e.target.value)} placeholder="Notas internas sobre esta pieza..." />
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign:'center' }}>Selecciona una pieza dental</p>
                )}
              </div>

              <div className="glass" style={{ padding: '16px 20px' }}>
                <h3 style={{ fontSize: '0.8rem', marginBottom: '12px', textTransform:'uppercase' }}>Resumen Clínica</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {resumen.map(e => (
                    <div key={e.key} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem' }}>
                      <span>{e.emoji} {e.label}</span>
                      <span style={{ fontWeight:800, color:e.color }}>{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
