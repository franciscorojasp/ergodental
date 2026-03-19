// src/pages/Citas.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import {
  getCitas, createCita, getPacientes, getPersonal,
  TABLA_REFERENCIAS,
  type Cita, type Paciente, type Personal, type TipoReferencia,
  type TipoAtencion, type CondicionPaciente, type EstadoFinanciero
} from '../api';
import RoleGuard from '../components/RoleGuard';

const ESTADO_CLASE: Record<Cita['estado'], string> = {
  Pendiente:  'badge-warning',
  Confirmada: 'badge-success',
  Completada: 'badge-admin',
  Cancelada:  'badge-danger',
};

const REF_ICON: Record<TipoReferencia, string> = {
  'Profesional-Especialista': '👨‍⚕️',
  'Paciente-Clinica':         '🏥',
  'Foraneo-30':               '🌍',
  'Foraneo-10':               '🌐',
};

const REF_COLOR: Record<TipoReferencia, string> = {
  'Profesional-Especialista': 'var(--primary)',
  'Paciente-Clinica':         'var(--success)',
  'Foraneo-30':               'var(--warning)',
  'Foraneo-10':               'var(--accent)',
};

export default function Citas() {
  const { clinica } = useClinica();
  const [citas, setCitas]         = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [personal, setPersonal]   = useState<Personal[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Cita['estado']>('Todos');
  const [modal, setModal]         = useState(false);
  const [modalNotif, setModalNotif] = useState<Cita | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  const hoy = new Date().toLocaleDateString('en-CA');

  const [form, setForm] = useState({
    pacienteId: '', doctorId: '', fecha: hoy, hora: '09:00',
    motivo: '', estado: 'Pendiente' as Cita['estado'],
    tipoAtencion: 'Consulta' as TipoAtencion,
    condicion: 'Evaluación' as CondicionPaciente,
    estadoFinanciero: 'Pago Inmediato' as EstadoFinanciero,
    tipoReferencia: '' as TipoReferencia | '',
    referidorNombre: '', referidorContacto: '',
    notifWhatsAppPaciente: true, notifEmailPaciente: false,
    notifWhatsAppDoctor: false,  notifEmailDoctor: false,
  });

  useEffect(() => {
    // Filtrar localmente por clinicaId (simulando comportamiento de API con scopes)
    getCitas().then((data: Cita[]) => setCitas(data.filter(c => c.clinicaId === clinica.id)));
    getPacientes().then((data: Paciente[]) => setPacientes(data.filter(p => p.clinicaId === clinica.id)));
    getPersonal().then((data: Personal[]) => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo === 'Odontólogo' && p.activo)));
  }, [clinica.id]);

  // Auto-fill referral from selected patient
  const onPacienteChange = (id: string) => {
    const pac = pacientes.find(p => p.id === id);
    setForm(f => ({
      ...f,
      pacienteId: id,
      tipoReferencia: pac?.tipoReferencia || '',
      referidorNombre: pac?.referidorNombre || '',
      referidorContacto: pac?.referidorContacto || '',
    }));
  };

  const filtradas = citas.filter(c => filtroEstado === 'Todos' || c.estado === filtroEstado);
  const detalle   = citas.find(c => c.id === detalleId);
  const reglaDetalle = detalle?.tipoReferencia ? TABLA_REFERENCIAS.find(r => r.tipo === detalle.tipoReferencia) : null;
  const reglaForm = form.tipoReferencia ? TABLA_REFERENCIAS.find(r => r.tipo === form.tipoReferencia) : null;

  // ── Notificación WhatsApp/Email ──
  const sendNotifications = (cita: Cita, customPac?: boolean, customDoc?: boolean) => {
    const pac = pacientes.find(p => p.id === cita.pacienteId);
    const doc = personal.find(p => p.id === cita.doctorId);

    // Si se pasan flags manuales (desde el modal de notif), usarlos. Si no, usar los del form de creación.
    const useNotifPacWA = customPac !== undefined ? customPac : form.notifWhatsAppPaciente;
    const useNotifDocWA = customDoc !== undefined ? customDoc : form.notifWhatsAppDoctor;

    if (useNotifPacWA && pac?.telefono) {
      const msg = `Hola ${pac.nombre}, recordamos su cita en ErgoDental (${clinica.nombreCorto}) el ${cita.fecha} a las ${cita.hora}. Motivo: ${cita.motivo}. ¡Le esperamos!`;
      window.open(`https://wa.me/${pac.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    }
    if (useNotifDocWA && doc?.telefono) {
      const msg = `Hola Dr/a. ${doc.nombre}, recordatorio de cita: Paciente ${cita.pacienteNombre}, ${cita.fecha} a las ${cita.hora}.`;
      window.open(`https://wa.me/${doc.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
      const doc = personal.find(p => p.id === form.doctorId);
      const nueva = await createCita({
        clinicaId: clinica.id,
        pacienteId: form.pacienteId,
        pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : '',
        doctorId: form.doctorId,
        doctorNombre: doc ? `${doc.nombre} ${doc.apellido}` : '',
        fecha: form.fecha, hora: form.hora, motivo: form.motivo, estado: form.estado,
        tipoAtencion: form.tipoAtencion,
        condicion: form.condicion,
        estadoFinanciero: form.estadoFinanciero,
        tipoReferencia: (form.tipoReferencia || undefined) as TipoReferencia | undefined,
        referidorNombre: form.referidorNombre || undefined,
        referidorContacto: form.referidorContacto || undefined,
      });
      setCitas(prev => [nueva, ...prev]);
      sendNotifications(nueva);
      setModal(false);
    } finally { setSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Citas</h1>
          <p style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="badge badge-primary" style={{ fontSize:'0.7rem' }}>{clinica.nombreCorto}</span>
            {filtradas.length} citas encontradas
          </p>
        </div>
        <RoleGuard modulo="citas" accion="crear">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nueva Cita</button>
        </RoleGuard>
      </div>

      {/* Filtros de estado */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'18px', flexWrap:'wrap' }}>
        {(['Todos','Pendiente','Confirmada','Completada','Cancelada'] as const).map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} className="btn btn-ghost btn-sm"
            style={filtroEstado === e ? { borderColor:'var(--primary)', color:'var(--primary)', background:'var(--primary-dim)' } : {}}>
            {e}
          </button>
        ))}
      </div>

      {/* Tabla de citas */}
      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Fecha</th><th>Hora</th><th>Paciente</th><th>Atención</th>
              <th>Doctor</th><th>Finanzas</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {filtradas.map((c, i) => {
                const regla = TABLA_REFERENCIAS.find(r => r.tipo === c.tipoReferencia);
                return (
                  <motion.tr key={c.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}>
                    <td style={{ fontWeight:600 }}>{c.fecha}</td>
                    <td style={{ color:'var(--primary)', fontWeight:700 }}>{c.hora}</td>
                    <td>
                      <div style={{ fontWeight:600 }}>{c.pacienteNombre}</div>
                      {regla && (
                        <div style={{ fontSize:'0.7rem', color: REF_COLOR[c.tipoReferencia!], fontWeight:700 }}>
                          {REF_ICON[c.tipoReferencia!]} {regla.label}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{c.tipoAtencion}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>{c.condicion}</div>
                    </td>
                    <td style={{ color:'var(--text-secondary)' }}>{c.doctorNombre}</td>
                    <td>
                      <span style={{ 
                        fontSize:'0.72rem', fontWeight:700, padding:'2px 6px', borderRadius:4,
                        background: c.estadoFinanciero === 'Pago Inmediato' ? 'rgba(0,198,255,0.1)' : 'rgba(255,107,107,0.1)',
                        color: c.estadoFinanciero === 'Pago Inmediato' ? 'var(--primary)' : 'var(--danger)'
                      }}>
                        {c.estadoFinanciero}
                      </span>
                    </td>
                    <td><span className={`badge ${ESTADO_CLASE[c.estado]}`}>{c.estado}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button className="btn btn-ghost btn-sm" title="Ver detalle" onClick={() => setDetalleId(c.id)}>🔍</button>
                        <button className="btn btn-ghost btn-sm" title="Enviar notificación" onClick={() => setModalNotif(c)}>🔔</button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Sin citas en esta sede</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Modal Detalle Cita ── */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setDetalleId(null)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
              <div className="modal-header">
                <h3>📅 Detalle de Cita</h3>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                  <span className={`badge ${ESTADO_CLASE[detalle.estado]}`}>{detalle.estado}</span>
                  <span className="badge badge-primary">{detalle.tipoAtencion}</span>
                  <span className="badge badge-success">{detalle.condicion}</span>
                  {reglaDetalle && (
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color: REF_COLOR[detalle.tipoReferencia!], display:'flex', alignItems:'center', gap:'4px' }}>
                      {REF_ICON[detalle.tipoReferencia!]} {reglaDetalle.label}
                    </span>
                  )}
                </div>
                
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                  {[
                    ['📅 Fecha/Hora', `${detalle.fecha} ${detalle.hora}`],
                    ['🦷 Paciente', detalle.pacienteNombre],
                    ['👨‍⚕️ Doctor', detalle.doctorNombre],
                    ['📋 Motivo', detalle.motivo],
                    ['💰 Estado Financiero', detalle.estadoFinanciero],
                    ['🏢 Sede', clinica.nombre],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', textTransform:'uppercase' }}>{label}</div>
                      <div style={{ fontSize:'0.88rem', fontWeight:600 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Bloque de referencia */}
                {reglaDetalle && (
                  <div style={{ marginTop:'14px', background:'var(--primary-dim)', border:'1px solid var(--primary)', borderRadius:'var(--radius-sm)', padding:'14px' }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--primary)', marginBottom:'8px' }}>
                      🔗 Referencia — {reglaDetalle.label}
                    </div>
                    {/* ... (referral details same as before) ... */}
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

      {/* ── Modal Nueva Cita ── */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:680}}>
              <div className="modal-header">
                <h3>📅 Nueva Cita — {clinica.nombreCorto}</h3>
                <button className="btn-close" onClick={()=>setModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Paciente *</label>
                      <select className="input" required value={form.pacienteId}
                        onChange={e => onPacienteChange(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Doctor *</label>
                      <select className="input" required value={form.doctorId}
                        onChange={e => setForm(f => ({ ...f, doctorId:e.target.value }))}>
                        <option value="">Seleccionar...</option>
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} — {p.especialidad}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Tipo de Atención</label>
                      <select className="input" value={form.tipoAtencion}
                        onChange={e => setForm(f => ({ ...f, tipoAtencion: e.target.value as TipoAtencion }))}>
                        <option>Consulta</option><option>Emergencia</option><option>Revisión</option><option>Tratamiento</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Condición del Paciente</label>
                      <select className="input" value={form.condicion}
                        onChange={e => setForm(f => ({ ...f, condicion: e.target.value as CondicionPaciente }))}>
                        <option>Evaluación</option><option>Control</option><option>Exonerado</option><option>Garantía</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Fecha y Hora *</label>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input className="input" type="date" required value={form.fecha} style={{ flex:2 }}
                          onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} />
                        <input className="input" type="time" required value={form.hora} style={{ flex:1 }}
                          onChange={e => setForm(f => ({ ...f, hora:e.target.value }))} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Estado Financiero</label>
                      <select className="input" value={form.estadoFinanciero}
                        onChange={e => setForm(f => ({ ...f, estadoFinanciero: e.target.value as EstadoFinanciero }))}>
                        <option>Pago Inmediato</option><option>Pago Anticipado</option><option>Paga Después</option><option>Paciente No Atendido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Motivo de la Cita *</label>
                      <input className="input" required value={form.motivo}
                        onChange={e => setForm(f => ({ ...f, motivo:e.target.value }))}
                        placeholder="Ej: Limpieza, Dolor molar..." />
                    </div>
                    <div className="input-group">
                      <label>Estado de Cita</label>
                      <select className="input" value={form.estado}
                        onChange={e => setForm(f => ({ ...f, estado:e.target.value as Cita['estado'] }))}>
                        <option>Pendiente</option><option>Confirmada</option><option>Completada</option><option>Cancelada</option>
                      </select>
                    </div>
                  </div>

                  {/* ── Referencia ── */}
                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px', marginTop:'6px' }}>
                    <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'10px' }}>
                      🔗 Referencia
                    </div>
                    <div className="input-group">
                      <select className="input" value={form.tipoReferencia}
                        onChange={e => setForm((f: any) => ({ ...f, tipoReferencia: e.target.value as TipoReferencia | '' }))}>
                        <option value="">Sin referencia específica (Paciente Clínica)</option>
                        {TABLA_REFERENCIAS.map(r => (
                          <option key={r.tipo} value={r.tipo}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    {reglaForm && (
                      <div className="grid-2" style={{ marginTop:'10px' }}>
                        <input className="input" placeholder="Nombre referidor" value={form.referidorNombre}
                          onChange={e => setForm((f: any) => ({ ...f, referidorNombre:e.target.value }))} />
                        <input className="input" placeholder="Contacto" value={form.referidorContacto}
                          onChange={e => setForm((f: any) => ({ ...f, referidorContacto:e.target.value }))} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : '+ Crear Cita'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Manual de Notificación (Campanita) ── */}
      <AnimatePresence>
        {modalNotif && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModalNotif(null)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
              <div className="modal-header">
                <h3>🔔 Enviar Notificación</h3>
                <button className="btn-close" onClick={()=>setModalNotif(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom:'16px', fontSize:'0.9rem', color:'var(--text-secondary)' }}>
                  Seleccione los destinatarios para enviar el recordatorio de la cita de <strong>{modalNotif.pacienteNombre}</strong>.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <label className="checkbox-wrap">
                    <input type="checkbox" defaultChecked /> 
                    <span>Enviar WhatsApp al Paciente</span>
                  </label>
                  <label className="checkbox-wrap">
                    <input type="checkbox" /> 
                    <span>Enviar WhatsApp al Doctor ({modalNotif.doctorNombre})</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setModalNotif(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => {
                  // Simplificado: obtener valores del DOM para evitar más estados
                  const checks = document.querySelectorAll('.modal-body input[type="checkbox"]');
                  sendNotifications(modalNotif, (checks[0] as HTMLInputElement).checked, (checks[1] as HTMLInputElement).checked);
                  setModalNotif(null);
                }}>
                  🚀 Enviar Ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

