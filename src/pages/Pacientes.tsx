// src/pages/Pacientes.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPacientes, createPaciente, updatePaciente, deletePaciente, 
  type Paciente, type TipoReferencia, TABLA_REFERENCIAS 
} from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import RoleGuard from '../components/RoleGuard';
import ConfirmDialog from '../components/ConfirmDialog';

const REF_BADGE: Record<TipoReferencia, string> = {
  'Profesional-Especialista': 'badge-doctor',
  'Paciente-Clinica':         'badge-success',
  'Foraneo-30':               'badge-warning',
  'Foraneo-10':               'badge-asistente',
};

function calcularEdad(fechaNacimiento: string): string {
  if (!fechaNacimiento) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNacimiento + 'T12:00:00');
  if (isNaN(nac.getTime())) return '—';
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

export default function Pacientes() {
  const { clinica } = useClinica();
  const [pacientes, setPacientes]     = useState<Paciente[]>([]);
  const [busqueda, setBusqueda]       = useState('');
  const [filtroRef, setFiltroRef]     = useState('Todos');
  const [modal, setModal]             = useState(false);
  const [detalleId, setDetalleId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const initForm = {
    clinicaId: clinica.id,
    nombre: '', apellido: '', cedula: '', fechaNacimiento: '', telefono: '',
    email: '', direccion: '',
    tipoReferencia: 'Paciente-Clinica' as TipoReferencia,
    referidorNombre: '', referidorContacto: '',
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => { 
    getPacientes().then(data => setPacientes(data.filter(p => p.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) {
      const existe = pacientes.find(p => p.cedula.trim().toLowerCase() === form.cedula.trim().toLowerCase());
      if (existe) {
        alert(`⚠️ Ya existe un paciente con la cédula ${form.cedula}. No se permiten duplicados.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        const actualizado = await updatePaciente({ ...form, id: editingId });
        setPacientes(prev => prev.map(p => p.id === editingId ? actualizado : p));
      } else {
        const nuevo = await createPaciente(form);
        setPacientes(prev => [nuevo, ...prev]);
      }
      closeModal();
    } catch (err) {
      alert('Error al guardar el paciente');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePaciente(deletingId);
      setPacientes(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err) { alert('Error al eliminar'); }
  };

  const openEdit = (p: Paciente) => {
    setEditingId(p.id);
    setForm({
      clinicaId: p.clinicaId,
      nombre: p.nombre, apellido: p.apellido, cedula: p.cedula,
      fechaNacimiento: p.fechaNacimiento || '',
      telefono: p.telefono || '', email: p.email || '',
      direccion: p.direccion || '',
      tipoReferencia: p.tipoReferencia || 'Paciente-Clinica',
      referidorNombre: p.referidorNombre || '',
      referidorContacto: p.referidorContacto || '',
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(initForm);
  };

  const filtros = ['Todos', ...TABLA_REFERENCIAS.map(r => r.label)];
  const filtrado = pacientes.filter(p => {
    const matchBusq = `${p.nombre} ${p.apellido} ${p.cedula} ${p.email}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchRef = filtroRef === 'Todos' || TABLA_REFERENCIAS.find(r => r.label === filtroRef)?.tipo === p.tipoReferencia;
    return matchBusq && matchRef;
  });

  const detalle = pacientes.find(p => p.id === detalleId);
  const reglaDetalle = detalle?.tipoReferencia ? TABLA_REFERENCIAS.find(r => r.tipo === detalle.tipoReferencia) : null;
  const reglaForm = TABLA_REFERENCIAS.find(r => r.tipo === form.tipoReferencia);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="badge badge-primary" style={{ fontSize:'0.7rem' }}>{clinica.nombreCorto}</span>
            {pacientes.length} pacientes registrados
          </p>
        </div>
        <RoleGuard modulo="pacientes" accion="crear">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Paciente</button>
        </RoleGuard>
      </div>

      <div className="glass" style={{ padding:'14px 18px', marginBottom:'18px', display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
        <div className="search-wrap" style={{ flex:'1 1 300px' }}>
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre, cédula o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', flex:'1 1 auto', justifyContent:'flex-start' }}>
          {filtros.map(f => (
            <button key={f} onClick={() => setFiltroRef(f)} className="btn btn-ghost btn-sm"
              style={filtroRef === f ? { borderColor:'var(--primary)', color:'var(--primary)', background:'var(--primary-dim)', flex:'1 1 auto' } : { flex:'1 1 auto' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Paciente</th><th>Cédula</th><th>Edad</th><th>Teléfono</th><th>Referido por</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {filtrado.map((p, i) => {
                const regla = TABLA_REFERENCIAS.find(r => r.tipo === p.tipoReferencia);
                return (
                  <motion.tr key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}>
                    <td onClick={() => setDetalleId(p.id)} style={{ cursor:'pointer' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{
                          width:34, height:34, borderRadius:'50%', flexShrink:0,
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.82rem',
                          color: '#fff'
                        }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{p.nombre} {p.apellido}</div>
                          <div style={{ fontSize:'0.76rem', color:'var(--text-muted)' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.cedula}</td>
                    <td>{calcularEdad(p.fechaNacimiento)}</td>
                    <td>{p.telefono}</td>
                    <td>
                      {regla ? <span className={`badge ${REF_BADGE[p.tipoReferencia!]}`}>{regla.label}</span> : <span className="badge badge-muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Editar">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeletingId(p.id)} style={{ color:'var(--danger)' }} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setDetalleId(null)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
              <div className="modal-header">
                <h3>{detalle.nombre} {detalle.apellido}</h3>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                {[
                  ['🪪 Cédula', detalle.cedula],
                  ['🎂 Edad', calcularEdad(detalle.fechaNacimiento)],
                  ['📞 Teléfono', detalle.telefono],
                  ['✉️ Email', detalle.email],
                  ['📍 Dirección', detalle.direccion],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:500 }}>{value}</div>
                  </div>
                ))}
                
                <div style={{ display:'flex', gap:'8px', marginTop:'20px', marginBottom:'12px' }}>
                  <button type="button" className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}
                    onClick={() => window.location.hash = `#/odontograma?pacienteId=${detalle.id}`}>
                    🦷 Odontograma
                  </button>
                  {detalle.telefono && (
                    <a className="btn btn-ghost" style={{ flex:1, justifyContent:'center', border:'1px solid #25D366', color:'#25D366' }}
                      href={`https://wa.me/${detalle.telefono.replace(/\s/g, '').replace(/-/g, '')}`} target="_blank" rel="noreferrer">
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setDetalleId(null)}>Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&closeModal()}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:640}}>
              <div className="modal-header">
                <h3>{editingId ? '✏️ Editar Paciente' : '🦷 Nuevo Paciente'}</h3>
                <button className="btn-close" onClick={()=>closeModal()}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group"><label>Nombre *</label><input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
                    <div className="input-group"><label>Apellido *</label><input className="input" required value={form.apellido} onChange={e=>setForm(f=>({...f,apellido:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Cédula *</label><input className="input" required placeholder="V-12345678" value={form.cedula} onChange={e=>setForm(f=>({...f,cedula:e.target.value}))} /></div>
                    <div className="input-group"><label>Fecha de nacimiento</label><input className="input" type="date" value={form.fechaNacimiento} onChange={e=>setForm(f=>({...f,fechaNacimiento:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Teléfono</label><input className="input" placeholder="0412-1234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
                    <div className="input-group"><label>Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  </div>
                  <div className="input-group"><label>Dirección</label><input className="input" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} /></div>

                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px', marginTop:'10px' }}>
                    <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'10px' }}>🔗 Referencia</div>
                    <div className="input-group">
                      <select className="input" value={form.tipoReferencia} onChange={e=>setForm(f=>({...f,tipoReferencia:e.target.value as TipoReferencia}))}>
                        {TABLA_REFERENCIAS.map(r => <option key={r.tipo} value={r.tipo}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>closeModal()}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...': (editingId ? 'Actualizar' : 'Registrar')}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!deletingId} 
        title="¿Eliminar Paciente?" 
        message="Esta acción no se puede deshacer y el paciente será borrado permanentemente."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
