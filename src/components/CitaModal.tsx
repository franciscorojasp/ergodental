// src/components/CitaModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPacientes, getPersonal, createCita, updateCita,
  type Cita, type Paciente, type Personal,
  type TipoAtencion, type CondicionPaciente, type EstadoFinanciero
} from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import { useResponsive } from '../hooks/useResponsive';

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
  if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val.substring(0, 5);
  if (/^\d{1}:\d{2}$/.test(val)) return '0' + val;
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  return val;
};

const formatHora12 = (hora24: string): string => {
  if (!hora24) return '09:00 am';
  try {
    const parts = hora24.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  } catch (e) {
    return hora24;
  }
};

const formatFechaLegible = (fechaStr: string): string => {
  if (!fechaStr) return '';
  try {
    const [y, m, d] = fechaStr.split('T')[0].split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return fechaStr;
  }
};

const cleanWhatsAppPhone = (phone: any): string => {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('04')) cleaned = '58' + cleaned.substring(1);
  else if (cleaned.startsWith('4') && cleaned.length === 10) cleaned = '58' + cleaned;
  return cleaned;
};

export default function CitaModal({ isOpen, onClose, onSaved, editingCita }: Props) {
  const { clinica } = useClinica();
  const { isMobile } = useResponsive();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para gestión fluida de la segunda notificación (Doctor) sin bloqueos de navegador
  const [pendingDoctorAlert, setPendingDoctorAlert] = useState<{
    doctorNombre: string;
    url: string;
  } | null>(null);

  const hoy = new Date().toLocaleDateString('en-CA');
  const initForm = {
    pacienteId: '', 
    doctorId: '', 
    fecha: hoy, 
    hora: '09:00',
    motivo: '', 
    estado: 'Pendiente' as Cita['estado'],
    tipoAtencion: 'Consulta' as TipoAtencion,
    condicion: 'Evaluación' as CondicionPaciente,
    estadoFinanciero: 'Pago Inmediato' as EstadoFinanciero,
    lastUpdated: undefined as number | undefined,
    enviarNotificacionesWhatsApp: true, // Automático por defecto según solicitud
    notificarPaciente: true, 
    notificarDoctor: true,   
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      getPacientes().then(data => setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
      getPersonal().then(data => setPersonal(data.filter(p => (clinica.id === 'consolidado' || p.clinicaId === clinica.id) && String(p.tipo).toLowerCase().includes('odont') && (p.activo !== false || (editingCita && p.id === editingCita.doctorId)))));
      
      setPendingDoctorAlert(null);

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
          lastUpdated: editingCita.lastUpdated,
          enviarNotificacionesWhatsApp: true,
          notificarPaciente: true,
          notificarDoctor: true,
        });
      } else {
        setForm(initForm);
      }
      setError(null);
    }
  }, [isOpen, editingCita, clinica.id]);

  const pacSeleccionado = pacientes.find(p => p.id === form.pacienteId);
  const docSeleccionado = personal.find(p => p.id === form.doctorId);

  const isFormValid = !!(form.pacienteId && form.doctorId && form.fecha && form.hora);

  const buildMensajePaciente = () => {
    const hora12 = formatHora12(form.hora);
    const fechaLegible = formatFechaLegible(form.fecha);
    const docNombre = docSeleccionado ? `${docSeleccionado.nombre} ${docSeleccionado.apellido}` : 'Especialista';
    const pacNombre = pacSeleccionado ? `${pacSeleccionado.nombre}` : 'Paciente';

    return `🦷 *RECORDATORIO DE CITA - ${clinica.nombre.toUpperCase()}* 🦷\n\n` +
      `Estimado(a) *${pacNombre}*, le confirmamos que su cita odontológica ha sido agendada con éxito:\n\n` +
      `📅 *Fecha:* ${fechaLegible}\n` +
      `⏰ *Hora:* ${hora12}\n` +
      `👨‍⚕️ *Doctor(a):* Dr(a). ${docNombre}\n` +
      `📋 *Atención:* ${form.tipoAtencion}\n` +
      `📝 *Motivo:* ${form.motivo || 'Evaluación y tratamiento'}\n` +
      `🏥 *Sede:* ${clinica.nombre}\n\n` +
      `_Por favor responda a este mensaje para confirmar su asistencia. ¡Le esperamos!_`;
  };

  const buildMensajeDoctor = () => {
    const hora12 = formatHora12(form.hora);
    const fechaLegible = formatFechaLegible(form.fecha);
    const docNombre = docSeleccionado ? `${docSeleccionado.nombre} ${docSeleccionado.apellido}` : 'Doctor';
    const pacNombre = pacSeleccionado ? `${pacSeleccionado.nombre} ${pacSeleccionado.apellido}` : 'Paciente';
    const pacTel = pacSeleccionado?.telefono ? ` (${pacSeleccionado.telefono})` : '';

    return `👨‍⚕️ *NUEVA CITA AGENDADA - ${clinica.nombre.toUpperCase()}* 👨‍⚕️\n\n` +
      `Estimado(a) Dr(a). *${docNombre}*, se ha programado una nueva cita en su agenda:\n\n` +
      `👤 *Paciente:* ${pacNombre}${pacTel}\n` +
      `📅 *Fecha:* ${fechaLegible}\n` +
      `⏰ *Hora:* ${hora12}\n` +
      `📋 *Atención:* ${form.tipoAtencion}\n` +
      `📝 *Motivo:* ${form.motivo || 'Consulta'}\n` +
      `🏥 *Sede:* ${clinica.nombre}\n\n` +
      `_Notificación automática generada por ErgoDentalVE._`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert("⚠️ Error: Faltan datos obligatorios para la cita.\nPor favor seleccione Paciente, Doctor, Fecha y Hora.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        clinicaId: clinica.id,
        pacienteId: form.pacienteId,
        pacienteNombre: pacSeleccionado ? `${pacSeleccionado.nombre} ${pacSeleccionado.apellido}` : '',
        doctorId: form.doctorId,
        doctorNombre: docSeleccionado ? `${docSeleccionado.nombre} ${docSeleccionado.apellido}` : '',
        fecha: form.fecha, 
        hora: form.hora, 
        motivo: form.motivo, 
        estado: form.estado,
        tipoAtencion: form.tipoAtencion,
        condicion: form.condicion,
        estadoFinanciero: form.estadoFinanciero,
        lastUpdated: form.lastUpdated,
      };

      let result: Cita;
      if (editingCita) {
        result = await updateCita({ ...payload, id: editingCita.id });
      } else {
        result = await createCita(payload);
      }

      onSaved(result);

      // PROCESAMIENTO AUTOMÁTICO DE WHATSAPP
      if (form.enviarNotificacionesWhatsApp) {
        const telPaciente = cleanWhatsAppPhone(pacSeleccionado?.telefono);
        const telDoctor = cleanWhatsAppPhone(docSeleccionado?.telefono);

        const urlPaciente = telPaciente 
          ? `https://wa.me/${telPaciente}?text=${encodeURIComponent(buildMensajePaciente())}` 
          : '';
        const urlDoctor = telDoctor 
          ? `https://wa.me/${telDoctor}?text=${encodeURIComponent(buildMensajeDoctor())}` 
          : '';

        const quierePaciente = form.notificarPaciente && !!urlPaciente;
        const quiereDoctor = form.notificarDoctor && !!urlDoctor;

        // Alerta si se seleccionó notificar pero no hay teléfono registrado
        if (form.notificarPaciente && !telPaciente) {
          console.warn('El paciente no tiene teléfono registrado para WhatsApp');
        }
        if (form.notificarDoctor && !telDoctor) {
          console.warn('El doctor no tiene teléfono registrado para WhatsApp');
        }

        if (quierePaciente && quiereDoctor) {
          // Abrir primero el WhatsApp del paciente
          window.open(urlPaciente, '_blank', 'noopener,noreferrer');

          // Intentar abrir el segundo popup automáticamente tras 700ms
          setTimeout(() => {
            try {
              window.open(urlDoctor, '_blank', 'noopener,noreferrer');
            } catch (err) {
              // Si el navegador bloquea la segunda ventana, el modal muestra el botón
            }
          }, 700);

          // Mostramos pantalla de confirmación con botón garantizado para el doctor
          setPendingDoctorAlert({
            doctorNombre: docSeleccionado ? `${docSeleccionado.nombre} ${docSeleccionado.apellido}` : 'Doctor',
            url: urlDoctor
          });
          return;
        } else if (quierePaciente) {
          window.open(urlPaciente, '_blank', 'noopener,noreferrer');
          onClose();
          return;
        } else if (quiereDoctor) {
          window.open(urlDoctor, '_blank', 'noopener,noreferrer');
          onClose();
          return;
        }
      }

      onClose();
    } catch (err: any) {
      console.error('DEBUG: Error saving cita', err);
      setError(err.message || 'Error al guardar la cita. Revisa tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="modal"
            style={{ maxWidth: '700px' }}
          >
            <div className="modal-handle" />

            {/* Header Quirúrgico */}
            <div className="modal-header" style={{ background: 'linear-gradient(to right, var(--primary-dim), transparent)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: isMobile ? '1.2rem' : '1.6rem' }}>📅</span>
                <span>{editingCita ? 'Editar Cita Médica' : 'Nueva Cita Médica'}</span>
              </h3>
              <button className="btn-close" onClick={onClose} style={{ fontSize: isMobile ? '1.2rem' : '1.5rem' }}>✕</button>
            </div>

            {pendingDoctorAlert ? (
              /* PANTALLA DE ÉXITO Y ENVÍO RÁPIDO AL DOCTOR (ANTI-BLOQUEO NAVEGADOR) */
              <div className="modal-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  ¡Cita Agendada Exitosamente!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px' }}>
                  La notificación de WhatsApp para el paciente ha sido abierta. Puedes enviar ahora la notificación al doctor especialista:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '380px', margin: '0 auto' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      window.open(pendingDoctorAlert.url, '_blank', 'noopener,noreferrer');
                      onClose();
                    }}
                    style={{
                      background: '#25D366', color: '#000', fontWeight: 800,
                      padding: '14px', borderRadius: '12px', fontSize: '1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(37, 211, 102, 0.3)'
                    }}
                  >
                    <span>📲</span> Enviar WhatsApp al Dr(a). {pendingDoctorAlert.doctorNombre}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onClose}
                    style={{ padding: '12px' }}
                  >
                    Listo / Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && (
                    <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '14px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', border: '1px solid var(--danger)', fontWeight: 600 }}>
                      ⚠️ {error}
                    </div>
                  )}

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Paciente *</label>
                      <select id="cita-paciente" name="pacienteId" className="input" required value={form.pacienteId} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))}>
                        <option value="">Seleccione Paciente...</option>
                        {editingCita && !pacientes.find(p => p.id === editingCita.pacienteId) && (
                          <option value={editingCita.pacienteId}>{editingCita.pacienteNombre}</option>
                        )}
                        {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Doctor Especialista *</label>
                      <select id="cita-doctor" name="doctorId" className="input" required value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}>
                        <option value="">Seleccione Doctor...</option>
                        {editingCita && !personal.find(p => p.id === editingCita.doctorId) && (
                          <option value={editingCita.doctorId}>{editingCita.doctorNombre}</option>
                        )}
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} - {p.especialidad || 'General'}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Fecha *</label>
                      <input id="cita-fecha" name="fecha" type="date" className="input" required value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <label>Hora *</label>
                      <input id="cita-hora" name="hora" type="time" className="input" required value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Motivo de Consulta</label>
                    <input id="cita-motivo" name="motivo" className="input" placeholder="Ej: Control de ortodoncia, Limpieza, Restauración, etc." value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
                  </div>
                  
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Estado de Cita</label>
                      <select id="cita-estado" name="estado" className="input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Cita['estado'] }))}>
                        <option value="Pendiente">⏳ Pendiente</option>
                        <option value="Confirmada">✅ Confirmada</option>
                        <option value="Completada">🏁 Completada</option>
                        <option value="Cancelada">❌ Cancelada</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Tipo de Atención</label>
                      <select id="cita-tipo-atencion" name="tipoAtencion" className="input" value={form.tipoAtencion} onChange={e => setForm(f => ({ ...f, tipoAtencion: e.target.value as TipoAtencion }))}>
                        <option value="Consulta">Consulta</option>
                        <option value="Tratamiento">Tratamiento</option>
                        <option value="Emergencia">Emergencia</option>
                        <option value="Revisión">Revisión</option>
                      </select>
                    </div>
                  </div>

                  {/* SECCIÓN WHATSAPP INTELIGENTE Y CONFIGURABLE */}
                  <div className="modal-whatsapp-section" style={{ 
                    background: form.enviarNotificacionesWhatsApp ? 'rgba(37, 211, 102, 0.06)' : 'rgba(255, 255, 255, 0.02)', 
                    border: form.enviarNotificacionesWhatsApp ? '1.5px solid rgba(37, 211, 102, 0.35)' : '1px solid var(--border)', 
                    padding: '18px 20px', 
                    borderRadius: '16px', 
                    marginTop: '16px',
                    transition: 'all 0.25s ease'
                  }}>
                    {/* Switch Maestro */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: form.enviarNotificacionesWhatsApp ? '14px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span style={{ color: form.enviarNotificacionesWhatsApp ? '#25D366' : 'var(--text-primary)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                          NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP
                        </span>
                      </div>
                      
                      {/* Control Selector Maestro */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                        <input 
                          type="checkbox"
                          checked={form.enviarNotificacionesWhatsApp}
                          onChange={e => setForm(f => ({ ...f, enviarNotificacionesWhatsApp: e.target.checked }))}
                          style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }}
                        />
                        <span style={{ color: form.enviarNotificacionesWhatsApp ? '#25D366' : 'var(--text-muted)' }}>
                          {form.enviarNotificacionesWhatsApp ? 'Habilitado al Guardar' : 'No Enviar'}
                        </span>
                      </label>
                    </div>

                    {/* Sub-opciones cuando está habilitado */}
                    {form.enviarNotificacionesWhatsApp && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(37, 211, 102, 0.2)' }}>
                        {/* Selector Paciente */}
                        <label style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
                          padding: '10px 14px', background: form.notificarPaciente ? 'rgba(37, 211, 102, 0.08)' : 'rgba(255,255,255,0.02)', 
                          borderRadius: '10px', border: form.notificarPaciente ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={form.notificarPaciente} 
                            onChange={e => setForm(f => ({ ...f, notificarPaciente: e.target.checked }))}
                            style={{ width: '18px', height: '18px', accentColor: '#25D366', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <div style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Notificar al Paciente</div>
                            <div style={{ fontSize: '0.72rem', color: pacSeleccionado?.telefono ? 'var(--text-secondary)' : 'var(--warning)', marginTop: '2px' }}>
                              {pacSeleccionado 
                                ? (pacSeleccionado.telefono ? `📱 ${pacSeleccionado.telefono}` : '⚠️ Sin teléfono registrado') 
                                : 'Seleccione paciente'}
                            </div>
                          </div>
                        </label>

                        {/* Selector Doctor */}
                        <label style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
                          padding: '10px 14px', background: form.notificarDoctor ? 'rgba(37, 211, 102, 0.08)' : 'rgba(255,255,255,0.02)', 
                          borderRadius: '10px', border: form.notificarDoctor ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={form.notificarDoctor} 
                            onChange={e => setForm(f => ({ ...f, notificarDoctor: e.target.checked }))}
                            style={{ width: '18px', height: '18px', accentColor: '#25D366', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <div style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Notificar al Doctor</div>
                            <div style={{ fontSize: '0.72rem', color: docSeleccionado?.telefono ? 'var(--text-secondary)' : 'var(--warning)', marginTop: '2px' }}>
                              {docSeleccionado 
                                ? (docSeleccionado.telefono ? `📱 ${docSeleccionado.telefono}` : '⚠️ Sin teléfono registrado') 
                                : 'Seleccione doctor'}
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                  <button type="submit" className={`btn ${isFormValid ? 'btn-primary' : 'btn-disabled'}`} disabled={saving || !isFormValid} style={{ minWidth: '180px' }}>
                    {saving ? '⏳ Procesando...' : (editingCita ? '💾 Actualizar Cita' : '💾 Guardar Cita')}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
