// src/components/CitaModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPacientes, getPersonal, createCita, updateCita,
  type Cita, type Paciente, type Personal, type TipoReferencia,
  type TipoAtencion, type CondicionPaciente, type EstadoFinanciero
} from '../api';
import { useClinica } from '../contexts/ClinicaContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (cita: Cita) => void;
  editingCita?: Cita | null;
}

const formatForDateInput = (val: string) => {
  if (!val) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) { return ''; }
};

const formatForTimeInput = (val: string) => {
  if (!val) return '09:00';
  // Si viene con segundos (09:00:00), quitar los últimos 3 caracteres
  if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val.substring(0, 5);
  // Si es 9:00 (sin el cero inicial), agregarlo
  if (/^\d{1}:\d{2}$/.test(val)) return '0' + val;
  // Si ya es HH:mm, devolver tal cual
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  return val;
};

export default function CitaModal({ isOpen, onClose, onSaved, editingCita }: Props) {
  const { clinica } = useClinica();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date().toLocaleDateString('en-CA');
  const initForm = {
    pacienteId: '', doctorId: '', fecha: hoy, hora: '09:00',
    motivo: '', estado: 'Pendiente' as Cita['estado'],
    tipoAtencion: 'Consulta' as TipoAtencion,
    condicion: 'Evaluación' as CondicionPaciente,
    estadoFinanciero: 'Pago Inmediato' as EstadoFinanciero,
    tipoReferencia: '' as TipoReferencia | '',
    referidorNombre: '', referidorContacto: '',
    lastUpdated: undefined as number | undefined,
    notificarPaciente: true, // Novedad: check para notificar por whatsapp
    notificarDoctor: true,   // Novedad: check para notificar por whatsapp
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    if (isOpen) {
      getPacientes().then(data => setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
      getPersonal().then(data => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo === 'Odontólogo' && p.activo)));
      
      if (editingCita) {
        setForm({
          pacienteId: editingCita.pacienteId || '',
          doctorId: editingCita.doctorId || '',
          fecha: formatForDateInput(editingCita.fecha),
          hora: formatForTimeInput(editingCita.hora),
          motivo: editingCita.motivo || '',
          estado: editingCita.estado || 'Pendiente',
          tipoAtencion: editingCita.tipoAtencion || 'Consulta',
          condicion: editingCita.condicion || 'Evaluación',
          estadoFinanciero: editingCita.estadoFinanciero || 'Pago Inmediato',
          tipoReferencia: editingCita.tipoReferencia || '',
          referidorNombre: editingCita.referidorNombre || '',
          referidorContacto: editingCita.referidorContacto || '',
          lastUpdated: editingCita.lastUpdated,
          notificarPaciente: true,
          notificarDoctor: true,
        });
      } else {
        setForm(initForm);
      }
      setError(null);
    }
  }, [isOpen, editingCita, clinica.id]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
      const doc = personal.find(p => p.id === form.doctorId);

      const payload = {
        clinicaId: clinica.id,
        pacienteId: form.pacienteId,
        pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : '',
        doctorId: form.doctorId,
        doctorNombre: doc ? `${doc.nombre} ${doc.apellido}` : '',
        fecha: form.fecha, 
        hora: form.hora, 
        motivo: form.motivo, 
        estado: form.estado,
        tipoAtencion: form.tipoAtencion,
        condicion: form.condicion,
        estadoFinanciero: form.estadoFinanciero,
        tipoReferencia: (form.tipoReferencia || undefined) as TipoReferencia | undefined,
        referidorNombre: form.referidorNombre || undefined,
        referidorContacto: form.referidorContacto || undefined,
        lastUpdated: form.lastUpdated,
      };

      let result: Cita;
      if (editingCita) {
        result = await updateCita({ ...payload, id: editingCita.id });
      } else {
        result = await createCita(payload);
      }

      onSaved(result);
      triggerNotificaciones();
      onClose();
    } catch (err: any) {
      console.error('DEBUG: Error saving cita', err);
      setError(err.message || 'Error al guardar. Revisa tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const triggerNotificaciones = () => {
    let notificados = [];
    if (form.notificarPaciente) {
      notifyWhatsapp('paciente');
      notificados.push('Paciente');
    }
    // Añadimos un pequeño retraso para que el navegador no bloquee 2 popups a la vez
    if (form.notificarDoctor) {
      setTimeout(() => {
        notifyWhatsapp('doctor');
      }, 500);
      notificados.push('Doctor');
    }
    if (notificados.length > 0) {
      alert(`Se han abierto pestañas de WhatsApp Web para notificar a: ${notificados.join(' y ')}.\\nOjo: Debes presionar el botón de Enviar dentro de la aplicación de WhatsApp para que les llegue.`);
    }
  };

  const notifyWhatsapp = (tipo: 'paciente' | 'doctor') => {
    const formatPhone = (phone: string) => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('04')) cleaned = '58' + cleaned.substring(1);
      else if (cleaned.startsWith('4')) cleaned = '58' + cleaned;
      return cleaned;
    };

    const pac = pacientes.find(p => p.id === form.pacienteId);
    const doc = personal.find(p => p.id === form.doctorId);

    let phone = '';
    let msg = '';
    
    // Formatear hora de 24h a 12h para el mensaje
    let hora12 = form.hora;
    try {
      const parts = form.hora.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      h = h ? h : 12;
      hora12 = `${h}:${m} ${ampm}`;
    } catch(e) {}

    // Formatear fecha a DD/MM/YYYY
    let fechaFormat = form.fecha;
    try {
      const d = new Date(form.fecha + 'T00:00:00');
      fechaFormat = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    } catch(e) {}

    if (tipo === 'paciente') {
      phone = pac?.telefono || '';
      msg = `Hola ${pac?.nombre || 'Paciente'}, le recordamos su cita el ${fechaFormat} a las ${hora12} con el Dr(a). ${doc?.nombre || ''}. ¡Le esperamos en Ergodental!`;
    } else {
      phone = doc?.telefono || '';
      msg = `Hola Dr(a). ${doc?.nombre || 'Doctor'}, le notificamos una cita agendada con el paciente ${pac?.nombre || ''} para el ${fechaFormat} a las ${hora12}. Motivo: ${form.motivo}.`;
    }

    if (!phone) {
      alert(`El ${tipo} seleccionado no tiene un número de teléfono telefónico registrado.`);
      return;
    }

    const finalPhone = formatPhone(phone);
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          style={{ zIndex: 1000 }}
        >
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editingCita ? '✏️ Editar Cita' : '📅 Nueva Cita'}</h3>
              <button className="btn-close" onClick={onClose}>✕</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && (
                  <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid var(--danger)' }}>
                    ⚠️ {error}
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label>Paciente *</label>
                    <select className="input" required value={form.pacienteId} onChange={e => onPacienteChange(e.target.value)}>
                      <option value="">Seleccione...</option>
                      {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Doctor *</label>
                    <select className="input" required value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}>
                      <option value="">Seleccione...</option>
                      {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>Fecha *</label>
                    <input type="date" className="input" required value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label>Hora *</label>
                    <input type="time" className="input" required value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                  </div>
                </div>

                <div className="input-group">
                  <label>Motivo</label>
                  <input className="input" placeholder="Ej: Control de ortodoncia" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
                </div>
                
                <div className="grid-2">
                  <div className="input-group">
                    <label>Estado</label>
                    <select className="input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Cita['estado'] }))}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="Completada">Completada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Tipo de Atención</label>
                    <select className="input" value={form.tipoAtencion} onChange={e => setForm(f => ({ ...f, tipoAtencion: e.target.value as TipoAtencion }))}>
                      <option value="Consulta">Consulta</option>
                      <option value="Tratamiento">Tratamiento</option>
                      <option value="Emergencia">Emergencia</option>
                      <option value="Revisión">Revisión</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>Condición</label>
                    <select className="input" value={form.condicion} onChange={e => setForm(f => ({ ...f, condicion: e.target.value as CondicionPaciente }))}>
                      <option value="Control">Control</option>
                      <option value="Evaluación">Evaluación</option>
                      <option value="Emergencia">Emergencia</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Estado Financiero</label>
                    <select className="input" value={form.estadoFinanciero} onChange={e => setForm(f => ({ ...f, estadoFinanciero: e.target.value as EstadoFinanciero }))}>
                      <option value="Abono">Abono</option>
                      <option value="Exonerado">Exonerado</option>
                      <option value="Garantía">Garantía</option>
                      <option value="Paciente No Atendido">Paciente No Atendido</option>
                      <option value="Paga Después">Paga Después</option>
                      <option value="Pago Anticipado">Pago Anticipado</option>
                      <option value="Pago Inmediato">Pago Inmediato</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(37, 211, 102, 0.1)', borderRadius: '12px', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#25D366', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Notificaciones por WhatsApp
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', color: '#e2e8f0' }}>
                      <input 
                        type="checkbox" 
                        checked={form.notificarPaciente} 
                        onChange={e => setForm(f => ({ ...f, notificarPaciente: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }}
                      />
                      Notificar al Paciente
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', color: '#e2e8f0' }}>
                      <input 
                        type="checkbox" 
                        checked={form.notificarDoctor} 
                        onChange={e => setForm(f => ({ ...f, notificarDoctor: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }}
                      />
                      Notificar al Doctor
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingCita ? 'Actualizar Cita' : 'Guardar Cita')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
