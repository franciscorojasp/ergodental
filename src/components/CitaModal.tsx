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
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    if (isOpen) {
      getPacientes().then(data => setPacientes(data.filter(p => p.clinicaId === clinica.id)));
      getPersonal().then(data => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo === 'Odontólogo' && p.activo)));
      
      if (editingCita) {
        setForm({
          pacienteId: editingCita.pacienteId,
          doctorId: editingCita.doctorId,
          fecha: formatForDateInput(editingCita.fecha),
          hora: editingCita.hora,
          motivo: editingCita.motivo,
          estado: editingCita.estado,
          tipoAtencion: editingCita.tipoAtencion || 'Consulta',
          condicion: editingCita.condicion || 'Evaluación',
          estadoFinanciero: editingCita.estadoFinanciero || 'Pago Inmediato',
          tipoReferencia: editingCita.tipoReferencia || '',
          referidorNombre: editingCita.referidorNombre || '',
          referidorContacto: editingCita.referidorContacto || '',
          lastUpdated: editingCita.lastUpdated,
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
      onClose();
    } catch (err: any) {
      console.error('DEBUG: Error saving cita', err);
      setError(err.message || 'Error desconocido al guardar la cita.');
    } finally {
      setSaving(false);
    }
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
                      <option value="Exonerado">Exonerado</option>
                      <option value="Garantía">Garantía</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Estado Financiero</label>
                    <select className="input" value={form.estadoFinanciero} onChange={e => setForm(f => ({ ...f, estadoFinanciero: e.target.value as EstadoFinanciero }))}>
                      <option value="Pago Inmediato">Pago Inmediato</option>
                      <option value="Pago Anticipado">Pago Anticipado</option>
                      <option value="Paga Después">Paga Después</option>
                      <option value="Paciente No Atendido">Paciente No Atendido</option>
                    </select>
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
