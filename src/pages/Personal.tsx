// src/pages/Personal.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPersonal, createPersonal, updatePersonal, deletePersonal, type Personal } from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { useResponsive } from '../hooks/useResponsive';
import Pagination from '../components/Pagination';

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
  const { isMobile } = useResponsive();

  // Selector de vista: Tarjetas o Tabla
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>(() => {
    return (localStorage.getItem('ergo_personal_view') as 'tarjetas' | 'tabla') || 'tarjetas';
  });

  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const cambiarVista = (nuevaVista: 'tarjetas' | 'tabla') => {
    setVista(nuevaVista);
    localStorage.setItem('ergo_personal_view', nuevaVista);
  };

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

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroTipo]);

  const totalItems = filtrado.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const personalPaginado = filtrado.slice((pagina - 1) * pageSize, pagina * pageSize);

  const detalle = personal.find(p => p.id === detalleId);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Personal Clínico</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Gestión de profesionales, especialistas y equipo administrativo</p>
        </div>
        <div className="action-grid" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Selector de Vista: Tarjetas o Tabla */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${vista === 'tarjetas' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => cambiarVista('tarjetas')}
              style={{
                borderRadius: '9px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Vista en Tarjetas"
            >
              <span>🗂️</span>
              <span className="hide-mobile">Tarjetas</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${vista === 'tabla' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => cambiarVista('tabla')}
              style={{
                borderRadius: '9px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Vista en Tabla"
            >
              <span>📋</span>
              <span className="hide-mobile">Tabla</span>
            </button>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setModal(true); }}>
            + Nuevo Personal
          </button>
        </div>
      </div>

      <div className="filter-glass" style={{ marginBottom: '24px' }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre o especialidad..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-8px', paddingLeft: '8px' }}>
          Categoría Profesional
        </div>
        <div className="filter-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '4px' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`btn btn-sm ${filtroTipo===t?'btn-primary':'btn-ghost'}`} style={{ borderRadius: '10px' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* RENDERIZADO CONDICIONAL DE VISTA: TARJETAS O TABLA */}
      {vista === 'tarjetas' ? (
        <div className="grid-responsive" style={{ gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {personalPaginado.map((p, i) => (
            <motion.div
              key={p.id}
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ padding: '24px', position: 'relative', minHeight: 'unset', background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setDetalleId(p.id)}>
                <div style={{
                  width: 64, height: 64, borderRadius: '18px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems:'center', justifyContent:'center', color: '#fff', fontWeight: 900, fontSize: '1.4rem',
                  boxShadow: '0 8px 15px var(--primary-dim)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{p.nombre} {p.apellido}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <span className={`badge ${ROL_BADGE[p.tipo] || 'badge-muted'}`} style={{ fontWeight: 800, fontSize: '0.65rem' }}>{p.tipo.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.5 }}>🏥</span> {p.especialidad || 'General'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.5 }}>📞</span> {p.telefono || 'Sin teléfono'}
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 12px' }}>{p.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={() => openEdit(p)} title="Editar">✏️</button>
                  <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }} onClick={() => setDeletingId(p.id)} title="Eliminar">🗑️</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* VISTA DE TABLA CLINICA */
        <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: '20px' }}>
          <div className="table-wrap">
            <table className="table-fixed">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Profesional / Especialista</th>
                  <th style={{ width: '18%' }}>Categoría y Rol</th>
                  <th className="hide-mobile" style={{ width: '18%' }}>Especialidad / Matrícula</th>
                  <th className="hide-mobile" style={{ width: '16%' }}>Contacto / Turno</th>
                  <th className="text-center" style={{ width: '100px' }}>Estado</th>
                  <th className="text-right" style={{ width: '110px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personalPaginado.map((p, i) => (
                  <motion.tr 
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Profesional con avatar y click para ficha */}
                    <td data-main="true" onClick={() => setDetalleId(p.id)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: '13px',
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 900, fontSize: '0.95rem', flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(0, 198, 255, 0.25)'
                        }}>
                          {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.nombre} {p.apellido}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.email || 'Sin correo registrado'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría y Rol */}
                    <td>
                      <span className={`badge ${ROL_BADGE[p.tipo] || 'badge-muted'}`} style={{ fontWeight: 800, fontSize: '0.72rem', padding: '4px 10px' }}>
                        {p.tipo.toUpperCase()}
                      </span>
                    </td>

                    {/* Especialidad / Matrícula */}
                    <td className="hide-mobile">
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {p.especialidad || 'General'}
                      </div>
                      {p.matricula && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          MPPS: {p.matricula}
                        </div>
                      )}
                    </td>

                    {/* Contacto / Turno */}
                    <td className="hide-mobile">
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📞</span>
                        <span>{p.telefono || 'Sin teléfono'}</span>
                      </div>
                      {p.turno && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          🕒 {p.turno}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="text-center">
                      <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        {p.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="text-right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ width: 32, height: 32, padding: 0 }} 
                          onClick={() => setDetalleId(p.id)}
                          title="Ver Ficha Completa"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ width: 32, height: 32, padding: 0 }} 
                          onClick={() => openEdit(p)}
                          title="Editar Información"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }} 
                          onClick={() => setDeletingId(p.id)}
                          title="Eliminar Personal"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Estado vacío si no hay coincidencias */}
      {totalItems === 0 && (
        <div className="table-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>No se encontró personal</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            No hay miembros que coincidan con la búsqueda o categoría seleccionada.
          </p>
        </div>
      )}

      {/* Paginación */}
      <div style={{ marginTop: '16px' }}>
        <Pagination 
          currentPage={pagina}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPagina}
          onPageSizeChange={(size) => { setPageSize(size); setPagina(1); }}
        />
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
