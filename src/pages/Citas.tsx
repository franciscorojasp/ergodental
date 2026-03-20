// src/pages/Citas.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import {
  getCitas, createCita, updateCita, deleteCita, getPacientes, getPersonal,
  type Cita, type Paciente, type Personal, type TipoReferencia,
  type TipoAtencion, type CondicionPaciente, type EstadoFinanciero
} from '../api';
import RoleGuard from '../components/RoleGuard';
import ConfirmDialog from '../components/ConfirmDialog';

const ESTADO_CLASE: Record<Cita['estado'], string> = {
  Pendiente:  'badge-warning',
  Confirmada: 'badge-success',
  Completada: 'badge-admin',
  Cancelada:  'badge-danger',
};

export default function Citas() {
  const { clinica } = useClinica();
  const [citas, setCitas]         = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [personal, setPersonal]   = useState<Personal[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Cita['estado']>('Todos');
  const [modal, setModal]         = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hoy = new Date().toLocaleDateString('en-CA');

  const initForm = {
    pacienteId: '', doctorId: '', fecha: hoy, hora: '09:00',
    motivo: '', estado: 'Pendiente' as Cita['estado'],
    tipoAtencion: 'Consulta' as TipoAtencion,
    condicion: 'Evaluación' as CondicionPaciente,
    estadoFinanciero: 'Pago Inmediato' as EstadoFinanciero,
    tipoReferencia: '' as TipoReferencia | '',
    referidorNombre: '', referidorContacto: '',
    notifWhatsAppPaciente: true, notifEmailPaciente: false,
    notifWhatsAppDoctor: false,  notifEmailDoctor: false,
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    getCitas().then((data: Cita[]) => setCitas(data.filter(c => c.clinicaId === clinica.id)));
    getPacientes().then((data: Paciente[]) => setPacientes(data.filter(p => p.clinicaId === clinica.id)));
    getPersonal().then((data: Personal[]) => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo === 'Odontólogo' && p.activo)));
  }, [clinica.id]);

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

  const sendNotifications = (cita: Cita) => {
    const pac = pacientes.find(p => p.id === cita.pacienteId);
    if (form.notifWhatsAppPaciente && pac?.telefono) {
      const msg = `Hola ${pac.nombre}, recordamos su cita en ErgoDental (${clinica.nombreCorto}) el ${cita.fecha} a las ${cita.hora}. Motivo: ${cita.motivo}. ¡Le esperamos!`;
      window.open(`https://wa.me/${pac.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
      const doc = personal.find(p => p.id === form.doctorId);
      
      const payload = {
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
      };

      if (editingId) {
        const actualizada = await updateCita({ ...payload, id: editingId });
        setCitas(prev => prev.map(c => c.id === editingId ? actualizada : c));
      } else {
        const nueva = await createCita(payload);
        setCitas(prev => [nueva, ...prev]);
        sendNotifications(nueva);
      }
      closeModal();
    } catch (err) { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCita(deletingId);
      setCitas(prev => prev.filter(c => c.id !== deletingId));
      setDeletingId(null);
    } catch (err) { alert('Error al eliminar'); }
  };

  const openEdit = (c: Cita) => {
    setEditingId(c.id);
    setForm({
      pacienteId: c.pacienteId, doctorId: c.doctorId, fecha: c.fecha, hora: c.hora,
      motivo: c.motivo, estado: c.estado,
      tipoAtencion: c.tipoAtencion || 'Consulta',
      condicion: c.condicion || 'Evaluación',
      estadoFinanciero: c.estadoFinanciero || 'Pago Inmediato',
      tipoReferencia: c.tipoReferencia || '',
      referidorNombre: c.referidorNombre || '',
      referidorContacto: c.referidorContacto || '',
      notifWhatsAppPaciente: false, notifEmailPaciente: false,
      notifWhatsAppDoctor: false,  notifEmailDoctor: false,
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(initForm);
  };

  return (
    <div>
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

      <div style={{ display:'flex', gap:'6px', marginBottom:'18px', flexWrap:'wrap' }}>
        {(['Todos','Pendiente','Confirmada','Completada','Cancelada'] as const).map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} className="btn btn-ghost btn-sm"
            style={filtroEstado === e ? { borderColor:'var(--primary)', color:'var(--primary)', background:'var(--primary-dim)', flex:'1 1 auto' } : { flex:'1 1 auto' }}>
            {e}
          </button>
        ))}
      </div>

      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Fecha/Hora</th><th>Paciente</th><th>Doctor</th><th>Motivo</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {filtradas.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}>
                  <td onClick={() => setDetalleId(c.id)} style={{ cursor:'pointer' }}>
                    <div style={{ fontWeight:700 }}>{c.fecha}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{c.hora}</div>
                  </td>
                  <td>{c.pacienteNombre}</td>
                  <td>{c.doctorNombre}</td>
                  <td style={{ fontSize:'0.85rem', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.motivo}</td>
                  <td><span className={`badge ${ESTADO_CLASE[c.estado]}`}>{c.estado}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeletingId(c.id)}>🗑️</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal Detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setDetalleId(null)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
              <div className="modal-header">
                <h3>Detalle de Cita</h3>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                {[
                  ['👤 Paciente', detalle.pacienteNombre],
                  ['👨‍⚕️ Doctor', detalle.doctorNombre],
                  ['📅 Fecha', detalle.fecha],
                  ['🕒 Hora', detalle.hora],
                  ['📝 Motivo', detalle.motivo],
                  ['📊 Estado', detalle.estado],
                  ['🏥 Atención', detalle.tipoAtencion],
                  ['🦷 Condición', detalle.condicion],
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

      {/* Modal Nuevo/Editar */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&closeModal()}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:600}}>
              <div className="modal-header">
                <h3>{editingId ? '✏️ Editar Cita' : '📅 Nueva Cita'}</h3>
                <button className="btn-close" onClick={()=>closeModal()}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Paciente *</label>
                      <select className="input" required value={form.pacienteId} onChange={e=>onPacienteChange(e.target.value)}>
                        <option value="">Seleccione...</option>
                        {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Doctor *</label>
                      <select className="input" required value={form.doctorId} onChange={e=>setForm(f=>({...f,doctorId:e.target.value}))}>
                        <option value="">Seleccione...</option>
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Fecha *</label><input type="date" className="input" required value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
                    <div className="input-group"><label>Hora *</label><input type="time" className="input" required value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} /></div>
                  </div>
                  <div className="input-group"><label>Motivo</label><input className="input" value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} /></div>
                  
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Estado</label>
                      <select className="input" value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value as Cita['estado']}))}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Completada">Completada</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Atención</label>
                      <select className="input" value={form.tipoAtencion} onChange={e=>setForm(f=>({...f,tipoAtencion:e.target.value as TipoAtencion}))}>
                        <option value="Consulta">Consulta</option>
                        <option value="Tratamiento">Tratamiento</option>
                        <option value="Urgencia">Urgencia</option>
                        <option value="Control">Control</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>closeModal()}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...': (editingId ? 'Actualizar' : 'Guardar')}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!deletingId} 
        title="¿Eliminar Cita?" 
        message="¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
