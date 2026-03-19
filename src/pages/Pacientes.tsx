// src/pages/Pacientes.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPacientes, createPaciente, type Paciente, type TipoReferencia,
  TABLA_REFERENCIAS,
} from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import RoleGuard from '../components/RoleGuard';

const REF_BADGE: Record<TipoReferencia, string> = {
  'Profesional-Especialista': 'badge-doctor',
  'Paciente-Clinica':         'badge-success',
  'Foraneo-30':               'badge-warning',
  'Foraneo-10':               'badge-asistente',
};

function calcularEdad(fechaNacimiento: string): number | string {
  if (!fechaNacimiento) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNacimiento + 'T12:00:00');
  if (isNaN(nac.getTime())) return '—';
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export default function Pacientes() {
  const { clinica } = useClinica();
  const [pacientes, setPacientes]     = useState<Paciente[]>([]);
  const [busqueda, setBusqueda]       = useState('');
  const [filtroRef, setFiltroRef]     = useState('Todos');
  const [modal, setModal]             = useState(false);
  const [detalleId, setDetalleId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  const [form, setForm] = useState<Omit<Paciente, 'id' | 'fechaRegistro'>>({
    clinicaId: clinica.id,
    nombre: '', apellido: '', cedula: '', fechaNacimiento: '', telefono: '',
    email: '', direccion: '',
    tipoReferencia: 'Paciente-Clinica',
    referidorNombre: '', referidorContacto: '',
  });

  useEffect(() => { 
    getPacientes().then(data => setPacientes(data.filter(p => p.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const filtros = ['Todos', ...TABLA_REFERENCIAS.map(r => r.label)];
  const filtrado = pacientes.filter(p => {
    const matchBusq = `${p.nombre} ${p.apellido} ${p.cedula} ${p.email}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchRef = filtroRef === 'Todos' || TABLA_REFERENCIAS.find(r => r.label === filtroRef)?.tipo === p.tipoReferencia;
    return matchBusq && matchRef;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const nuevo = await createPaciente(form);
      setPacientes(prev => [nuevo, ...prev]);
      setModal(false);
      setForm({ clinicaId: clinica.id, nombre:'', apellido:'', cedula:'', fechaNacimiento:'', telefono:'', email:'', direccion:'', tipoReferencia:'Paciente-Clinica', referidorNombre:'', referidorContacto:'' });
    } finally { setSaving(false); }
  };

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

      {/* Filtros */}
      <div className="glass" style={{ padding:'14px 18px', marginBottom:'18px', display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
        <div className="search-wrap" style={{ flex:1, minWidth:'200px' }}>
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre, cédula o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {filtros.map(f => (
            <button key={f} onClick={() => setFiltroRef(f)} className="btn btn-ghost btn-sm"
              style={filtroRef === f ? { borderColor:'var(--primary)', color:'var(--primary)', background:'var(--primary-dim)' } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Paciente</th><th>Cédula</th><th>Edad</th><th>Teléfono</th><th>Referido por</th><th>Referidor</th>
            </tr></thead>
            <tbody>
              {filtrado.map((p, i) => {
                const regla = TABLA_REFERENCIAS.find(r => r.tipo === p.tipoReferencia);
                return (
                  <motion.tr key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                    style={{ cursor:'pointer' }} onClick={() => setDetalleId(p.id)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{
                          width:34, height:34, borderRadius:'50%', flexShrink:0,
                          background:'linear-gradient(135deg, var(--primary), var(--accent))',
                          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.82rem',
                        }}>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{p.nombre} {p.apellido}</div>
                          <div style={{ fontSize:'0.76rem', color:'var(--text-muted)' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color:'var(--text-secondary)' }}>{p.cedula}</td>
                    <td style={{ fontWeight:600 }}>
                      {(() => {
                        const edad = calcularEdad(p.fechaNacimiento);
                        return typeof edad === 'number' ? `${edad} años` : edad;
                      })()}
                    </td>
                    <td>{p.telefono}</td>
                    <td>
                      {regla ? (
                        <span className={`badge ${REF_BADGE[p.tipoReferencia!]}`} style={{ fontSize:'0.72rem' }}>
                          {regla.label}
                        </span>
                      ) : <span className="badge badge-muted">—</span>}
                    </td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'0.84rem' }}>
                      {p.referidorNombre || '—'}
                    </td>
                  </motion.tr>
                );
              })}
              {filtrado.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Sin resultados</td></tr>
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
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
              <div className="modal-header">
                <h3>{detalle.nombre} {detalle.apellido}</h3>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
                  {reglaDetalle && <span className={`badge ${REF_BADGE[detalle.tipoReferencia!]}`}>{reglaDetalle.label}</span>}
                </div>
                {[
                  ['🪪 Cédula', detalle.cedula],
                  ['🎂 Edad', (() => {
                    const edad = calcularEdad(detalle.fechaNacimiento);
                    return typeof edad === 'number' ? `${edad} años` : edad;
                  })()],
                  ['📞 Teléfono', detalle.telefono],
                  ['✉️ Email', detalle.email],
                  ['📍 Dirección', detalle.direccion],
                  ['📅 Registro', detalle.fechaRegistro],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:500 }}>{value}</div>
                  </div>
                ))}

                {/* Sección de referencia */}
                {reglaDetalle && (
                  <div style={{ marginTop:'12px', background:'var(--primary-dim)', border:'1px solid var(--primary)', borderRadius:'var(--radius-sm)', padding:'12px 14px' }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--primary)', marginBottom:'8px' }}>🔗 Referencia — {reglaDetalle.label}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'6px' }}>{reglaDetalle.descripcion}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', margin:'8px 0' }}>
                      {[
                        { label:'🏥 Clínica', pct: reglaDetalle.pctClinica, color:'var(--primary)' },
                        { label:'💰 Foráneo', pct: reglaDetalle.pctForaneo, color:'var(--warning)' },
                        { label:'👨‍⚕️ Profesional', pct: reglaDetalle.pctProfesional, color:'var(--success)' },
                      ].map(col => (
                        <div key={col.label} style={{ textAlign:'center', background:'rgba(0,0,0,0.2)', borderRadius:'6px', padding:'8px' }}>
                          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{col.label}</div>
                          <div style={{ fontWeight:800, color:col.color, fontSize:'1rem' }}>{col.pct}%</div>
                        </div>
                      ))}
                    </div>
                    {detalle.referidorNombre && (
                      <div style={{ fontSize:'0.82rem', marginTop:'6px' }}>
                        <span style={{ color:'var(--text-muted)' }}>Referidor: </span>
                        <strong>{detalle.referidorNombre}</strong>
                        {detalle.referidorContacto && <span style={{ color:'var(--text-secondary)' }}> · {detalle.referidorContacto}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setDetalleId(null)}>Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal nuevo paciente */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:640}}>
              <div className="modal-header">
                <h3>🦷 Nuevo Paciente</h3>
                <button className="btn-close" onClick={()=>setModal(false)}>✕</button>
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

                  {/* ── Referencia ── */}
                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px' }}>
                    <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'10px', letterSpacing:'0.5px' }}>
                      🔗 Referencia del Paciente
                    </div>
                    <div className="input-group">
                      <label>Referido por *</label>
                      <select className="input" value={form.tipoReferencia} onChange={e=>setForm(f=>({...f,tipoReferencia:e.target.value as TipoReferencia}))}>
                        {TABLA_REFERENCIAS.map(r => (
                          <option key={r.tipo} value={r.tipo}>{r.label} — {r.descripcion}</option>
                        ))}
                      </select>
                    </div>

                    {/* Preview de porcentajes */}
                    {reglaForm && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', margin:'10px 0' }}>
                        {[
                          { label:'🏥 Clínica', pct: reglaForm.pctClinica, color:'var(--primary)' },
                          { label:'💰 Foráneo', pct: reglaForm.pctForaneo, color:'var(--warning)' },
                          { label:'👨‍⚕️ Profesional', pct: reglaForm.pctProfesional, color:'var(--success)' },
                        ].map(col => (
                          <div key={col.label} style={{ textAlign:'center', background:'var(--bg-card)', borderRadius:'6px', padding:'8px', border:'1px solid var(--border)' }}>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{col.label}</div>
                            <div style={{ fontWeight:800, color:col.color }}>{col.pct}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {reglaForm?.pctForaneo! > 0 && (
                      <div style={{ fontSize:'0.75rem', color:'var(--warning)', marginBottom:'6px' }}>
                        ⚠️ El foráneo recibe {reglaForm!.pctForaneo}% del total. El resto ({100 - reglaForm!.pctForaneo}%) se divide entre clínica y profesional.
                      </div>
                    )}

                    <div className="grid-2">
                      <div className="input-group">
                        <label>Nombre del referidor</label>
                        <input className="input" placeholder="Nombre del especialista o clínica" value={form.referidorNombre || ''} onChange={e=>setForm(f=>({...f,referidorNombre:e.target.value}))} />
                      </div>
                      <div className="input-group">
                        <label>Contacto del referidor</label>
                        <input className="input" placeholder="Teléfono o email" value={form.referidorContacto || ''} onChange={e=>setForm(f=>({...f,referidorContacto:e.target.value}))} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Registrar Paciente'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
