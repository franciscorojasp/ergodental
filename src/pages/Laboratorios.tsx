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
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Laboratorios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Seguimiento de prótesis y trabajos externos</p>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Registrar Envío</button>
        </div>
      </div>

      <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead>
              <tr>
                <th className="col-expand">Paciente y Trabajo</th>
                <th className="hide-mobile" style={{ width: '180px' }}>Laboratorio</th>
                <th className="hide-mobile" style={{ width: '200px' }}>Envío / Entrega</th>
                <th className="text-center" style={{ width: '140px' }}>Estado</th>
                <th style={{ width: '140px' }}>Costo</th>
                <th className="text-right" style={{ width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l, i) => (
                <motion.tr 
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <td className="col-expand" data-main="true">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: '14px', 
                        background: 'linear-gradient(135deg, var(--primary-dim), rgba(255,255,255,0.05))',
                        border: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        🦷
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.3px' }}>{l.pacienteNombre}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>{l.trabajo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{l.laboratorioNombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Proveedor Externo</div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ opacity: 0.5, marginRight: '4px' }}>📤</span> {l.fechaEnvio}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <span style={{ opacity: 0.5, marginRight: '4px' }}>📥</span> Est: {l.fechaEntregaPrevista || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${l.estado === 'Recibido' ? 'badge-success' : (l.estado === 'Atrasado' ? 'badge-danger' : 'badge-warning')}`} style={{ padding: '4px 12px', minWidth: '100px', justifyContent: 'center' }}>
                      {l.estado.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}>{fmt(l.costo)}</div>
                  </td>
                  <td className="text-right">
                    <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={() => { setEditingId(l.id); setForm(l as any); setModal(true); }} title="Editar">✏️</button>
                      <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }} onClick={() => setDeletingId(l.id)} title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {labs.length === 0 && (
                <tr><td colSpan={6} className="table-empty">No hay trabajos de laboratorio registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
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
