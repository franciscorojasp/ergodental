// src/pages/Personal.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPersonal, createPersonal, updatePersonal, deletePersonal, type Personal } from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import ConfirmDialog from '../components/ConfirmDialog';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMobile] = useState(window.innerWidth < 768);

  const initForm: Omit<Personal,'id'> = {
    clinicaId: clinica.id,
    nombre:'', apellido:'', tipo:'Odontólogo', especialidad:'', matricula:'', turno:'Completo (8am-5pm)', telefono:'', email:'', activo: true,
    lastUpdated: undefined as number | undefined,
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => { 
    getPersonal().then(data => setPersonal(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId && form.email) {
      const existe = personal.find(p => p.email?.toLowerCase() === form.email?.toLowerCase());
      if (existe) {
        alert(`⚠️ Ya existe un miembro del personal con el correo ${form.email}.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        const actualizado = await updatePersonal({ ...form, id: editingId });
        setPersonal(prev => prev.map(p => p.id === editingId ? actualizado : p));
      } else {
        const nuevo = await createPersonal(form);
        setPersonal(prev => [nuevo, ...prev]);
      }
      closeModal();
    } catch (err) {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePersonal(deletingId);
      setPersonal(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err) { alert('Error al eliminar'); }
  };

  const openEdit = (p: Personal) => {
    setEditingId(p.id);
    setForm({
      clinicaId: p.clinicaId,
      nombre: p.nombre, apellido: p.apellido, tipo: p.tipo,
      especialidad: p.especialidad || '', matricula: p.matricula || '',
      turno: p.turno || '', telefono: p.telefono || '', email: p.email || '',
      activo: p.activo ?? true,
      lastUpdated: p.lastUpdated,
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(initForm);
  };

  const tipos = ['Todos', ...TIPOS];
  const filtrado = personal.filter(p => {
    const matchBusqueda = `${p.nombre} ${p.apellido} ${p.especialidad}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const detalle = personal.find(p => p.id === detalleId);

  return (
    <div>
      <div className="page-header condensed">
        <h1 className="is-mobile-inline">Personal</h1>
        <div className="action-grid">
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nuevo</button>
        </div>
      </div>

      <div className="filter-glass" style={{ padding: '8px 12px', marginBottom: '8px' }}>
        <div className="search-wrap" style={{ width:'100%', marginBottom:'8px' }}>
          <span className="search-icon">🔍</span>
          <input className="input input-sm" placeholder="Buscar por nombre o especialidad..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="filter-grid mobile-scroll" style={{ width:'100%', gap:'8px' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`btn btn-sm ${filtroTipo===t?'btn-primary':'btn-ghost'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-responsive" style={{ gap: '16px' }}>
        {filtrado.map((p, i) => (
          <motion.div
            key={p.id}
            className="glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ padding: '20px', position: 'relative' }}
            whileHover={{ scale: 1.01 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', cursor: 'pointer' }} onClick={() => setDetalleId(p.id)}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems:'center', justifyContent:'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem',
              }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre} {p.apellido}</div>
                <span className={`badge ${ROL_BADGE[p.tipo] || 'badge-muted'}`} style={{ marginTop: '4px' }}>{p.tipo}</span>
              </div>
            </div>
            
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
              {p.especialidad && <div>🏥 {p.especialidad}</div>}
              {p.telefono && <div>📞 {p.telefono}</div>}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${p.activo ? 'badge-success' : 'badge-muted'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeletingId(p.id)}>🗑️</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setDetalleId(null)}
          >
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>👨‍⚕️ Ficha de Personal</h3>
                <button className="btn-close" onClick={() => setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'1.4rem' }}>{detalle.nombre.charAt(0)}{detalle.apellido.charAt(0)}</div>
                  <div>
                    <h2 style={{ fontSize:'1.2rem', marginBottom:'4px' }}>{detalle.nombre} {detalle.apellido}</h2>
                    <span className={`badge ${ROL_BADGE[detalle.tipo]}`}>{detalle.tipo}</span>
                  </div>
                </div>
                {[
                  ['🏥 Especialidad', detalle.especialidad],
                  ['📋 Matrícula', detalle.matricula],
                  ['🕐 Turno', detalle.turno],
                  ['📞 Teléfono', detalle.telefono],
                  ['✉️ Email', detalle.email],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:500 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setDetalleId(null)}>Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar/Nuevo */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{ maxWidth: 600 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>{editingId ? '✏️ Editar Personal' : '👨‍⚕️ Nuevo Miembro'}</h3>
                <button className="btn-close" onClick={() => closeModal()}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group"><label>Nombre *</label><input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
                    <div className="input-group"><label>Apellido *</label><input className="input" required value={form.apellido} onChange={e=>setForm(f=>({...f,apellido:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Tipo *</label>
                      <select className="input" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as Personal['tipo']}))}>
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="input-group"><label>Especialidad</label><input className="input" value={form.especialidad} onChange={e=>setForm(f=>({...f,especialidad:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                    <div className="input-group"><label>Teléfono</label><input className="input" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => closeModal()}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!deletingId} 
        title="¿Eliminar Miembro?" 
        message="¿Estás seguro de que deseas eliminar este miembro del personal? Esta acción es definitiva."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
