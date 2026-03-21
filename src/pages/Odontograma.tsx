import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    getPacientes().then(data => setPacientes(data.filter(p => p.clinicaId === clinica.id)));
  }, [clinica.id]);

  const loadOdontograma = useCallback(async (id: string) => {
    if (!id) { setPiezas(initPiezas()); return; }
    setLoading(true);
    try {
      const data = await getOdontograma(id);
      if (data) setPiezas(data.piezas);
      else setPiezas(initPiezas());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadOdontograma(pacienteId);
  }, [pacienteId, loadOdontograma]);

  const handleSave = async () => {
    if (!pacienteId) { 
      console.warn('DEBUG: No pacienteId for save');
      alert('Selecciona un paciente primero'); 
      return; 
    }
    console.log('DEBUG: handleSave Odontograma started', { pacienteId, piezasCount: piezas.length });
    setSaving(true);
    try {
      const result = await saveOdontograma({ pacienteId, piezas });
      console.log('DEBUG: saveOdontograma success', result);
      alert('¡Odontograma guardado con éxito!');
    } catch (err: any) {
      console.error('DEBUG: saveOdontograma error', err);
      alert(`Error al guardar el odontograma: ${err.message || 'Error desconocido'}`);
    } finally { 
      setSaving(false); 
      console.log('DEBUG: handleSave Odontograma finished');
    }
  };

  const estadoInfo = (e: EstadoPieza) => ESTADOS.find(x => x.key === e) || ESTADOS[0];

  const handlePieza = (num: number) => {
    setPiezas(prev => prev.map(p => p.numero === num ? { ...p, estado: herramienta } : p));
    setSelected(num);
  };

  const pieza = piezas.find(p => p.numero === selected);

  const updateNota = (nota: string) => {
    if (!selected) return;
    setPiezas(prev => prev.map(p => p.numero === selected ? { ...p, notas: nota } : p));
  };

  const resetPiezas = () => { if(confirm('¿Reiniciar todo el mapa dental?')) { setPiezas(initPiezas()); setSelected(null); } };

  const resumen = ESTADOS.map(e => ({
    ...e,
    count: piezas.filter(p => p.estado === e.key).length,
  })).filter(e => e.count > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Odontograma</h1>
          <p>Mapa dental interactivo — haz clic en una pieza para cambiar su estado</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
            <select className="input" value={pacienteId} onChange={e => setPacienteId(e.target.value)} style={{ width: '240px' }}>
              <option value="">Seleccionar paciente...</option>
              {pacientes.map((p, i) => (
                <option key={`${p.id}-${i}`} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>
              ))}
            </select>
          <button className="btn btn-ghost btn-sm" onClick={resetPiezas}>↺ Reiniciar</button>
        </div>
      </div>

      {loading && (
        <div className="glass" style={{ padding: '20px', textAlign: 'center', marginBottom: '20px', color: 'var(--primary)' }}>
          Cargando odontograma del paciente...
        </div>
      )}

      {/* Herramientas */}
      <div className="glass" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
          Herramienta activa
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ESTADOS.map(e => (
            <button key={e.key} onClick={() => setHerramienta(e.key)} className="btn btn-ghost btn-sm"
              style={herramienta === e.key ? { borderColor: e.color, color: e.color, background: `color-mix(in srgb, ${e.color} 15%, transparent)` } : {}}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 310px', gap: '20px', alignItems: 'start' }}>
        {/* Mapa dental */}
        <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            ↑ Maxilar Superior ↑
          </div>

          {/* Superior: 1-16, izquierda a derecha */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px', minWidth: '680px' }}>
            {SUPERIOR.map(n => {
              const p = piezas.find(x => x.numero === n) || { numero: n, estado: 'sano', notas: '' };
              const info = estadoInfo(p.estado as EstadoPieza);
              return (
                <motion.button key={n} onClick={() => handlePieza(n)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  style={{
                    width: 38, height: 42,
                    borderRadius: '8px 8px 4px 4px',
                    border: selected === n ? `2px solid ${info.color}` : '1px solid var(--border)',
                    background: selected === n ? `color-mix(in srgb, ${info.color} 25%, transparent)` : `color-mix(in srgb, ${info.color} 12%, transparent)`,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                    transition: 'all 0.15s',
                    boxShadow: selected === n ? `0 0 12px ${info.color}66` : 'none',
                  }}>
                  <span style={{ fontSize: '1rem' }}>{info.emoji}</span>
                  <span style={{ fontSize: '0.6rem', color: info.color, fontWeight: 700 }}>{n}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px dashed var(--border)', margin: '24px 0', position: 'relative' }}>
            <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: '#111827', padding: '0 12px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              LÍNEA MEDIA
            </span>
          </div>

          {/* Inferior: 17-32 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '8px', minWidth: '680px' }}>
            {INFERIOR.map(n => {
              const p = piezas.find(x => x.numero === n) || { numero: n, estado: 'sano', notas: '' };
              const info = estadoInfo(p.estado as EstadoPieza);
              return (
                <motion.button key={n} onClick={() => handlePieza(n)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  style={{
                    width: 38, height: 42,
                    borderRadius: '4px 4px 8px 8px',
                    border: selected === n ? `2px solid ${info.color}` : '1px solid var(--border)',
                    background: selected === n ? `color-mix(in srgb, ${info.color} 25%, transparent)` : `color-mix(in srgb, ${info.color} 12%, transparent)`,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                    transition: 'all 0.15s',
                    boxShadow: selected === n ? `0 0 12px ${info.color}66` : 'none',
                  }}>
                  <span style={{ fontSize: '0.6rem', color: info.color, fontWeight: 700 }}>{n}</span>
                  <span style={{ fontSize: '1rem' }}>{info.emoji}</span>
                </motion.button>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '24px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            ↓ Maxilar Inferior ↓
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pieza seleccionada */}
          <div className="glass" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Pieza seleccionada</h4>
            {pieza ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ 
                    width: 50, height: 50, borderRadius: '12px', 
                    background: `color-mix(in srgb, ${estadoInfo(pieza.estado).color} 20%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800,
                    color: estadoInfo(pieza.estado).color, border: `1px solid ${estadoInfo(pieza.estado).color}`
                  }}>
                    {pieza.numero}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: estadoInfo(pieza.estado).color }}>{estadoInfo(pieza.estado).label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado de la pieza</div>
                  </div>
                </div>
                <div className="input-group">
                  <label>Notas clínicas</label>
                  <textarea className="input" rows={4} placeholder="Observaciones sobre esta pieza..."
                    value={pieza.notas} onChange={e => updateNota(e.target.value)}
                    style={{ resize: 'none', fontSize: '0.88rem' }} />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px', filter: 'grayscale(1)', opacity: 0.3 }}>🦷</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selecciona una pieza dental para ver o editar su estado</p>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="glass" style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Resumen</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {resumen.map(e => (
                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{e.emoji}</span>
                    <span style={{ fontSize: '0.84rem' }}>{e.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: e.color, fontSize: '0.9rem' }}>{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !pacienteId} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {saving ? '⌛ Guardando...' : '💾 Guardar Odontograma'}
          </button>
        </div>
      </div>
    </div>
  );
}
