// src/pages/Personal.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPersonal, createPersonal, type Personal } from '../api';
import { useClinica } from '../contexts/ClinicaContext';

const TIPOS: Personal['tipo'][] = ['Odontólogo', 'Enfermera', 'Asistente', 'Administrativo', 'Recepcionista', 'Coordinador'];

const ROL_BADGE: Record<string, string> = {
  'Odontólogo':    'badge-doctor',
  'Enfermera':     'badge-asistente',
  'Asistente':     'badge-asistente',
  'Administrativo':'badge-recepcion',
  'Recepcionista': 'badge-recepcion',
  'Coordinador':   'badge-admin',
};

export default function Personal() {
  const { clinica } = useClinica();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Personal,'id'>>({
    clinicaId: clinica.id,
    nombre:'', apellido:'', tipo:'Odontólogo', especialidad:'', matricula:'', turno:'Completo (8am-5pm)', telefono:'', email:'', activo: true,
  });

  useEffect(() => { 
    getPersonal().then(data => setPersonal(data.filter(p => p.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const tipos = ['Todos', ...TIPOS];
  const filtrado = personal.filter(p => {
    const matchBusqueda = `${p.nombre} ${p.apellido} ${p.especialidad}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await createPersonal(form);
      setPersonal(prev => [nuevo, ...prev]);
      setModal(false);
      setForm({ clinicaId: clinica.id, nombre:'', apellido:'', tipo:'Odontólogo', especialidad:'', matricula:'', turno:'Completo (8am-5pm)', telefono:'', email:'', activo: true });
    } finally {
      setSaving(false);
    }
  };

  const detalle = personal.find(p => p.id === detalleId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Personal</h1>
          <p style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="badge badge-primary" style={{ fontSize:'0.7rem' }}>{clinica.nombreCorto}</span>
            {personal.filter(p => p.activo).length} miembros activos · {personal.length} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Miembro</button>
      </div>

      {/* Filtros + búsqueda */}
      <div className="glass" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: '1 1 300px' }}>
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre o especialidad..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} className="btn btn-ghost btn-sm"
              style={filtroTipo === t ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-dim)', flex: '1 1 auto' } : { flex: '1 1 auto' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de personal */}
      <div className="grid-responsive" style={{ gap: '16px' }}>
        {filtrado.map((p, i) => (
          <motion.div
            key={p.id}
            className="glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ padding: '20px', cursor: 'pointer' }}
            onClick={() => setDetalleId(p.id)}
            whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.1rem',
              }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.nombre} {p.apellido}
                </div>
                <span className={`badge ${ROL_BADGE[p.tipo] || 'badge-muted'}`} style={{ marginTop: '4px' }}>{p.tipo}</span>
              </div>
            </div>
            {p.especialidad && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                🏥 {p.especialidad}
              </div>
            )}
            {p.matricula && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                📋 Matrícula: {p.matricula}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>🕐 {p.turno}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {p.telefono}</div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <span className={`badge ${p.activo ? 'badge-success' : 'badge-muted'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          </motion.div>
        ))}
        {filtrado.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No se encontraron miembros del personal
          </div>
        )}
      </div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setDetalleId(null)}
          >
            <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>👨‍⚕️ Ficha de Personal</h3>
                <button className="btn-close" onClick={() => setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1.4rem',
                  }}>{detalle.nombre.charAt(0)}{detalle.apellido.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{detalle.nombre} {detalle.apellido}</div>
                    <span className={`badge ${ROL_BADGE[detalle.tipo] || 'badge-muted'}`}>{detalle.tipo}</span>
                    {' '}
                    <span className={`badge ${detalle.activo ? 'badge-success' : 'badge-muted'}`}>{detalle.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
                {[
                  ['🏥 Especialidad', detalle.especialidad],
                  ['📋 Matrícula', detalle.matricula],
                  ['🕐 Turno', detalle.turno],
                  ['📞 Teléfono', detalle.telefono],
                  ['✉️ Email', detalle.email],
                ].map(([label, value]) => value ? (
                  <div key={label as string} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
                  </div>
                ) : null)}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDetalleId(null)}>Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal nuevo miembro */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setModal(false)}
          >
            <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>👨‍⚕️ Nuevo Miembro del Personal</h3>
                <button className="btn-close" onClick={() => setModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Nombre *</label>
                      <input className="input" required value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Apellido *</label>
                      <input className="input" required value={form.apellido} onChange={e => setForm(f => ({...f, apellido: e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Tipo *</label>
                      <select className="input" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value as Personal['tipo']}))}>
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Especialidad</label>
                      <input className="input" placeholder="Ej: Ortodoncia" value={form.especialidad} onChange={e => setForm(f => ({...f, especialidad: e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Matrícula Profesional</label>
                      <input className="input" placeholder="Ej: ORT-1042" value={form.matricula} onChange={e => setForm(f => ({...f, matricula: e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Turno</label>
                      <select className="input" value={form.turno} onChange={e => setForm(f => ({...f, turno: e.target.value}))}>
                        <option>Mañana (8am-12pm)</option>
                        <option>Tarde (1pm-5pm)</option>
                        <option>Completo (8am-5pm)</option>
                        <option>Nocturno (6pm-10pm)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Teléfono</label>
                      <input className="input" placeholder="0412-1234567" value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Email</label>
                      <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                    </div>
                  </div>
                  <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm(f => ({...f, activo: e.target.checked}))} style={{ width: 16, height: 16 }} />
                    <label htmlFor="activo" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Miembro activo</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
