// src/pages/Laboratorios.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLaboratorios, createLaboratorio, updateLaboratorio, deleteLaboratorio, getPacientes } from '../api';
import type { Laboratorio, Paciente } from '../api';
import { useClinica } from '../contexts/ClinicaContext';
import { useMoneda } from '../contexts/MonedaContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Laboratorios() {
  const { clinica } = useClinica();
  const { fmt } = useMoneda();
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMobile] = useState(window.innerWidth < 768);

  const initForm = {
    clinicaId: clinica.id,
    pacienteId: '',
    pacienteNombre: '',
    trabajo: '',
    laboratorioNombre: '',
    fechaEnvio: new Date().toISOString().split('T')[0],
    fechaEntregaPrevista: '',
    estado: 'Enviado' as any,
    costo: 0,
  };

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    getLaboratorios().then(data => setLabs(data.filter(l => clinica.id === 'consolidado' || l.clinicaId === clinica.id)));
    getPacientes().then(data => setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
  }, [clinica.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pac = pacientes.find(p => p.id === form.pacienteId);
    const finalForm = { ...form, pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : '' };

    if (editingId) {
      const res = await updateLaboratorio({ ...finalForm, id: editingId });
      setLabs(prev => prev.map(l => l.id === editingId ? res : l));
    } else {
      const res = await createLaboratorio(finalForm);
      setLabs(prev => [res, ...prev]);
    }
    closeModal();
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
          <h1>Laboratorios Profesionales</h1>
          <p>Control de trabajos externos y prótesis — {clinica.nombreCorto}</p>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setModal(true)}>+ Registrar Trabajo</button>
        </div>
      </div>

      <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead>
              <tr>
                <th className="text-left col-expand" style={{ width: '20%' }}>Paciente</th>
                <th className="text-left col-expand" style={{ width: '25%' }}>Trabajo / Prótesis</th>
                <th style={{ width: '15%' }} className="text-left hide-mobile">Laboratorio</th>
                <th style={{ width: '15%' }} className="text-left hide-mobile">Envío / Entrega</th>
                <th style={{ width: '10%' }} className="text-center">Estado</th>
                <th style={{ width: '10%' }} className="text-left">Costo</th>
                <th style={{ width: '5%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {labs.map(l => (
                <tr key={l.id}>
                  <td className="text-left col-expand" data-main="true"><div style={{fontWeight:600}}>{l.pacienteNombre}</div></td>
                  <td className="text-left col-expand" data-label="Trabajo">{l.trabajo}</td>
                  <td className="text-left hide-mobile" data-label="Laboratorio">{l.laboratorioNombre}</td>
                  <td className="text-left hide-mobile" data-label="Envío/Entrega">
                    <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{l.fechaEnvio}</div>
                    <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Est: {l.fechaEntregaPrevista}</div>
                  </td>
                  <td className="text-center" data-label="Estado">
                    <span className={`badge ${l.estado === 'Recibido' ? 'badge-success' : (l.estado === 'Atrasado' ? 'badge-danger' : 'badge-warning')}`}>
                      {l.estado}
                    </span>
                  </td>
                  <td className="text-left" data-label="Costo"><div style={{fontWeight:700}}>{fmt(l.costo)}</div></td>
                  <td className="text-right">
                    <div style={{display:'flex', gap:'8px', justifyContent: 'flex-end'}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(l.id); setForm(l as any); setModal(true); }}>✏️</button>
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => setDeletingId(l.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {labs.length === 0 && <tr><td colSpan={8} className="table-empty">No hay trabajos de laboratorio registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {modal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>{editingId ? 'Editar Trabajo' : 'Registrar en Laboratorio'}</h3>
                <button className="btn-close" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="input-group">
                    <label>Paciente *</label>
                    <select className="input" required value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value})}>
                      <option value="">Seleccionar paciente...</option>
                      {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Descripción del Trabajo *</label>
                    <input className="input" required placeholder="Ej: Corona Zirconio, Prótesis Total..." value={form.trabajo} onChange={e => setForm({...form, trabajo: e.target.value})} />
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Nombre del Laboratorio</label>
                      <input className="input" value={form.laboratorioNombre} onChange={e => setForm({...form, laboratorioNombre: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Costo (USD)</label>
                      <input className="input" type="number" step="0.01" value={form.costo} onChange={e => setForm({...form, costo: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Fecha Envío</label>
                      <input className="input" type="date" value={form.fechaEnvio} onChange={e => setForm({...form, fechaEnvio: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Fecha Entrega Prevista</label>
                      <input className="input" type="date" value={form.fechaEntregaPrevista} onChange={e => setForm({...form, fechaEntregaPrevista: e.target.value})} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Estado</label>
                    <select className="input" value={form.estado} onChange={e => setForm({...form, estado: e.target.value as any})}>
                      <option value="Enviado">Enviado</option>
                      <option value="Recibido">Recibido</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Eliminar registro"
        message="¿Estás seguro de eliminar este registro de laboratorio?"
        onConfirm={async () => {
          if (deletingId) {
            await deleteLaboratorio(deletingId);
            setLabs(prev => prev.filter(l => l.id !== deletingId));
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
        type="danger"
      />
    </div>
  );
}
