// src/pages/Pacientes.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPacientes, createPaciente, updatePaciente, deletePaciente, 
  TABLA_REFERENCIAS, getEvoluciones, createEvolucion, getPagos, getPresupuestos
} from '../api';
import type { Paciente, TipoReferencia, EvolucionClinica, Pago, Presupuesto } from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import { useAuth } from '../contexts/AuthContext';
import { useMoneda } from '../contexts/MonedaContext';
import RoleGuard from '../components/RoleGuard';
import ConfirmDialog from '../components/ConfirmDialog';

const REF_BADGE: Record<TipoReferencia, string> = {
  'Profesional-Especialista': 'badge-doctor',
  'Paciente-Clinica':         'badge-success',
  'Foraneo-30':               'badge-warning',
  'Foraneo-10':               'badge-asistente',
};

function calcularEdad(fecha: string): string {
  if (!fecha) return '—';
  try {
    const hoy = new Date();
    const cumple = new Date(fecha);
    if (isNaN(cumple.getTime())) return '—';
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return `${edad} años`;
  } catch (e) { return '—'; }
};

const formatForDateInput = (val: string) => {
  if (!val) return '';
  try {
    // Si viene con formato 'YYYY-MM-DD' explícito:
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Si viene con formato ISO 'YYYY-MM-DDTHH:mm...', corta y toma solo la fecha:
    if (val.includes('T')) return val.split('T')[0];
    
    // Si Google Sheets lo devuelve como DD/MM/YYYY o DD-MM-YYYY
    const partes = val.split(/[/-]/);
    if (partes.length === 3) {
      if (partes[0].length === 4) { // YYYY/MM/DD
        return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
      }
      if (partes[2].length === 4) { // Asumimos DD/MM/YYYY por default local
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
    
    // Intento general, construyendo YYYY-MM-DD localmente para evitar desajuste horario del .toISOString()
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    console.error('Error evaluando fecha de nacimiento:', e);
    return '';
  }
};

export default function Pacientes() {
  const { clinica } = useClinica();
  const [pacientes, setPacientes]     = useState<Paciente[]>([]);
  const [busqueda, setBusqueda]       = useState('');
  const [isMobile]                    = useState(window.innerWidth < 768);
  const [filtroRef, setFiltroRef]     = useState('Todos');
  const [modal, setModal]             = useState(false);
  const [detalleId, setDetalleId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [tab, setTab]                 = useState<'datos'|'evolucion'|'galeria'|'cuentas'>('datos');
  const [evoluciones, setEvoluciones] = useState<EvolucionClinica[]>([]);
  const [pagos, setPagos]             = useState<Pago[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const { user } = useAuth();
  const { fmt } = useMoneda();

  const initForm = {
    clinicaId: clinica.id,
    nombre: '', apellido: '', cedula: '', fechaNacimiento: '', telefono: '',
    email: '', direccion: '',
    tipoReferencia: 'Paciente-Clinica' as TipoReferencia,
    referidorNombre: '', referidorContacto: '',
    alergias: false,
    alergiasDetalle: '',
    lastUpdated: undefined as number | undefined,
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => { 
    getPacientes().then(data => setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id))); 
    getEvoluciones().then(setEvoluciones);
    getPagos().then(setPagos);
    getPresupuestos().then(setPresupuestos);
  }, [clinica.id]);

  const isFormValid = !!(form.nombre && form.apellido && form.cedula && form.fechaNacimiento && (!form.alergias || form.alergiasDetalle));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert("⚠️ Error: Faltan campos obligatorios.\nPor favor complete: Nombre, Apellido, Cédula y Fecha de Nacimiento.");
      return;
    }
    
    try {
      if (!editingId) {
        const cedulaBuscada = String(form.cedula || '').trim().toLowerCase();
        const existe = pacientes.find(p => String(p?.cedula || '').trim().toLowerCase() === cedulaBuscada);
        if (existe) {
          alert(`⚠️ Ya existe un paciente con la cédula ${form.cedula}.`);
          return;
        }
      }

      setSaving(true);
      if (editingId) {
        const actualizado = await updatePaciente({ ...form, id: editingId });
        setPacientes(prev => prev.map(p => p.id === editingId ? actualizado : p));
      } else {
        const nuevo = await createPaciente(form);
        setPacientes(prev => [nuevo, ...prev]);
      }
      closeModal();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    console.log('DEBUG: handleDelete started', deletingId);
    try {
      await deletePaciente(deletingId);
      console.log('DEBUG: Paciente deleted successfully');
      setPacientes(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err) { 
      console.error('DEBUG: Error in handleDelete', err);
      alert('Error al eliminar'); 
    }
  };

  const openEdit = (p: Paciente) => {
    setEditingId(p.id);
    setForm({
      clinicaId: p.clinicaId,
      nombre: p.nombre, apellido: p.apellido, cedula: p.cedula,
      fechaNacimiento: formatForDateInput(p.fechaNacimiento),
      telefono: p.telefono || '', email: p.email || '',
      direccion: p.direccion || '',
      tipoReferencia: p.tipoReferencia || 'Paciente-Clinica',
      referidorNombre: p.referidorNombre || '',
      referidorContacto: p.referidorContacto || '',
      alergias: !!p.alergias,
      alergiasDetalle: p.alergiasDetalle || '',
      lastUpdated: p.lastUpdated,
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

  return (
    <div>
      <div className="page-header condensed">
        <h1 className="is-mobile-inline">Pacientes</h1>
        <div className="action-grid">
          <RoleGuard modulo="pacientes" accion="crear">
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nuevo</button>
          </RoleGuard>
        </div>
      </div>

      <div className="filter-glass">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre, cédula o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="filter-grid">
          {filtros.map(f => (
            <button key={f} onClick={() => setFiltroRef(f)} className={`btn btn-sm ${filtroRef === f ? 'btn-primary' : 'btn-ghost'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead><tr>
              <th className="text-left col-expand" style={{ width: '35%' }}>Paciente</th>
              <th style={{ width: '15%' }} className="text-left hide-mobile">Cédula</th>
              <th style={{ width: '10%' }} className="text-left hide-mobile">Edad</th>
              <th style={{ width: '15%' }} className="text-left">Teléfono</th>
              <th style={{ width: '15%' }} className="text-left hide-mobile">Referido por</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Acciones</th>
            </tr></thead>
            <tbody>
              {filtrado.map((p, i) => {
                const regla = TABLA_REFERENCIAS.find(r => r.tipo === p.tipoReferencia);
                return (
                  <motion.tr key={`${p.id}-${i}`} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}>
                    <td className="col-expand" data-main="true" onClick={() => setDetalleId(p.id)} style={{ cursor:'pointer' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{
                            width:32, height:32, borderRadius:'50%', flexShrink:0,
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.75rem',
                            color: '#fff', border:'1px solid rgba(255,255,255,0.1)'
                          }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'1rem', lineHeight:1.1 }}>{p.nombre} {p.apellido}</div>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{p.email}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:'2px' }}>
                          <button className="btn btn-ghost btn-sm" style={{ width:32, height:32, padding:0, borderRadius:'50%' }} onClick={(e) => { e.stopPropagation(); openEdit(p); }}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ width:32, height:32, padding:0, borderRadius:'50%', color:'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}>🗑️</button>
                        </div>
                      </div>
                    </td>
                    <td className="text-left" style={{ padding: '0 !important' }}>
                      <div className="clinical-row">
                        <span style={{opacity:0.6}}>📞</span> {p.telefono}
                        <span style={{opacity:0.2, margin:'0 4px'}}>|</span>
                        <span style={{opacity:0.6}}>🆔</span> {p.cedula}
                      </div>
                      <div className="clinical-row" style={{ marginTop:2 }}>
                        <span style={{opacity:0.6}}>🎂</span> {calcularEdad(p.fechaNacimiento)} años
                        {regla && <>
                          <span style={{opacity:0.2, margin:'0 4px'}}>|</span>
                          <span className={`badge ${REF_BADGE[p.tipoReferencia!]}`} style={{ transform:'scale(0.85)', transformOrigin:'left center' }}>{regla.label}</span>
                        </>}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtrado.length === 0 && (
                <tr><td colSpan={6} className="table-empty">Sin pacientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setDetalleId(null)}>
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{ maxWidth: 800 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff' }}>
                    {detalle.nombre.charAt(0)}{detalle.apellido.charAt(0)}
                  </div>
                  <h3>{detalle.nombre} {detalle.apellido}</h3>
                </div>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['datos', 'evolucion', 'galeria', 'cuentas'].map(t => (
                  <button key={t} onClick={() => setTab(t as any)} 
                    style={{ 
                      flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer',
                      color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                      borderBottom: tab === t ? '2px solid var(--primary)' : 'none',
                      fontWeight: tab === t ? 700 : 500, transition: '0.2s', textTransform: 'uppercase', fontSize: '0.75rem'
                    }}>
                    {t === 'datos' && '🪪 Perfil'}
                    {t === 'evolucion' && '🦷 Evolución'}
                    {t === 'galeria' && '📁 Galería'}
                    {t === 'cuentas' && '💰 Cuentas'}
                  </button>
                ))}
              </div>

              <div className="modal-body">
                {tab === 'datos' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid-2" style={{ gap:'12px' }}>
                       {[
                        ['🪪 Cédula', detalle.cedula],
                        ['🎂 Edad', calcularEdad(detalle.fechaNacimiento)],
                        ['📞 Teléfono', detalle.telefono],
                        ['✉️ Email', detalle.email],
                        ['📍 Dirección', detalle.direccion],
                        ['⚠️ Alergias', detalle.alergias ? `SÍ (${detalle.alergiasDetalle})` : 'No'],
                      ].map(([label, value]) => (
                        <div key={label as string} style={{ padding:'12px', background:'var(--bg-card)', borderRadius:'10px', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:800, marginBottom:'4px' }}>{label}</div>
                          <div style={{ fontSize:'0.9rem', fontWeight:600 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {tab === 'evolucion' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
                      <input className="input" placeholder="Nuevo tratamiento / Nota..." id="evo-proc" />
                      <button className="btn btn-primary" onClick={async () => {
                        const proc = (document.getElementById('evo-proc') as HTMLInputElement).value;
                        if(!proc) return;
                        const nueva = await createEvolucion({
                          pacienteId: detalle.id,
                          clinicaId: clinica.id,
                          doctorNombre: user?.nombre || 'Doctor',
                          fecha: new Date().toISOString(),
                          procedimiento: proc,
                          notas: ''
                        });
                        setEvoluciones(prev => [nueva, ...prev]);
                        (document.getElementById('evo-proc') as HTMLInputElement).value = '';
                      }}>+ Añadir</button>
                    </div>
                    <div className="table-wrap" style={{ maxHeight: 300 }}>
                      <table>
                        <thead><tr><th>Fecha</th><th>Procedimiento</th><th>Doctor</th></tr></thead>
                        <tbody>
                          {evoluciones.filter(e => e.pacienteId === detalle.id).map(e => (
                            <tr key={e.id}>
                              <td style={{ fontSize:'0.75rem' }}>{new Date(e.fecha).toLocaleDateString()}</td>
                              <td>{e.procedimiento}</td>
                              <td style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{e.doctorNombre}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {tab === 'galeria' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="glass" style={{ padding:'20px', textAlign:'center', border:'2px dashed var(--border)' }}>
                      <p style={{ color:'var(--text-secondary)', marginBottom:'12px' }}>📂 Historial de Imágenes y Archivos</p>
                      <button className="btn btn-ghost" onClick={() => window.open(`https://drive.google.com/drive/search?q=${detalle.cedula}`, '_blank')}>
                        🔍 Buscar en Google Drive
                      </button>
                      <p style={{ fontSize:'0.7rem', marginTop:'10px', opacity:0.6 }}>Consejo: Sube tus archivos a Drive con la cédula del paciente para encontrarlos rápido.</p>
                    </div>
                  </motion.div>
                )}

                {tab === 'cuentas' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {(() => {
                      const totalPresupuestado = presupuestos.filter(p => p.pacienteId === detalle.id).reduce((sum, p) => sum + p.total, 0);
                      const totalPagado = pagos.filter(p => p.pacienteId === detalle.id && p.estado === 'Pagado').reduce((sum, p) => sum + p.monto, 0);
                      const deuda = totalPresupuestado - totalPagado;
                      return (
                        <div className="grid-2">
                          <div className="stat-card">
                            <div className="stat-label">Total Presupuestado</div>
                            <div className="stat-value">{fmt(totalPresupuestado)}</div>
                          </div>
                          <div className="stat-card" style={{ background: deuda > 0 ? 'rgba(255,77,106,0.1)' : 'var(--bg-card)' }}>
                            <div className="stat-label" style={{ color: deuda > 0 ? 'var(--danger)' : 'inherit' }}>Saldo Pendiente</div>
                            <div className="stat-value" style={{ color: deuda > 0 ? 'var(--danger)' : 'inherit' }}>{fmt(deuda)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
                
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
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{maxWidth:640}}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>{editingId ? '✏️ Editar Paciente' : '🦷 Nuevo Paciente'}</h3>
                <button className="btn-close" onClick={()=>closeModal()}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group"><label>Nombre *</label><input id="paciente-nombre" name="nombre" className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
                    <div className="input-group"><label>Apellido *</label><input id="paciente-apellido" name="apellido" className="input" required value={form.apellido} onChange={e=>setForm(f=>({...f,apellido:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Cédula *</label><input id="paciente-cedula" name="cedula" className="input" required placeholder="V-12345678" value={form.cedula} onChange={e=>setForm(f=>({...f,cedula:e.target.value}))} /></div>
                    <div className="input-group"><label>Fecha de nacimiento *</label><input id="paciente-fecha-nacimiento" name="fechaNacimiento" className="input" type="date" value={form.fechaNacimiento} onChange={e=>setForm(f=>({...f,fechaNacimiento:e.target.value}))} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Teléfono</label><input id="paciente-telefono" name="telefono" className="input" placeholder="0412-1234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
                    <div className="input-group"><label>Email</label><input id="paciente-email" name="email" className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  </div>
                  <div className="input-group"><label>Dirección</label><input id="paciente-direccion" name="direccion" className="input" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} /></div>

                  <div style={{ marginTop:'18px', padding:'12px', background:form.alergias ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius:'12px', border: `1px solid ${form.alergias ? 'var(--danger)' : 'var(--border)'}`, transition:'all 0.3s ease' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', marginBottom: form.alergias ? '10px' : '0' }}>
                      <input type="checkbox" checked={form.alergias} onChange={e=>setForm(f=>({...f,alergias:e.target.checked}))} style={{ width:'18px', height:'18px', accentColor:'var(--danger)' }} />
                      <span style={{ fontWeight:700, fontSize:'0.9rem', color: form.alergias ? 'var(--danger)' : 'inherit' }}>⚠️ ¿El paciente posee alergias?</span>
                    </label>
                    
                    {form.alergias && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}>
                        <div className="input-group" style={{ marginBottom:0 }}>
                          <label style={{ fontSize:'0.75rem', color:'var(--danger)', fontWeight:600 }}>ESPECIFIQUE LA ALERGIA *</label>
                          <input className="input" required={form.alergias} placeholder="Ej: Penicilina, Látex, AINES..." value={form.alergiasDetalle} onChange={e=>setForm(f=>({...f,alergiasDetalle:e.target.value}))} style={{ borderColor:'var(--danger)', background:'rgba(239, 68, 68, 0.05)' }} />
                        </div>
                      </motion.div>
                    )}
                  </div>

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
                  <button type="submit" className={`btn ${isFormValid ? 'btn-primary' : 'btn-disabled'}`} disabled={saving || !isFormValid}>{saving?'Guardando...': (editingId ? 'Actualizar' : 'Registrar')}</button>
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
