// src/pages/Citas.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import {
  getCitas, deleteCita,
  type Cita
} from '../api';
import RoleGuard from '../components/RoleGuard';
import ConfirmDialog from '../components/ConfirmDialog';
import CitaModal from '../components/CitaModal';

const ESTADO_CLASE: Record<Cita['estado'], string> = {
  Pendiente:  'badge-warning',
  Confirmada: 'badge-success',
  Completada: 'badge-admin',
  Cancelada:  'badge-danger',
};

export default function Citas() {
  const { clinica } = useClinica();
  const [citas, setCitas]         = useState<Cita[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Cita['estado']>('Todos');
  const [modal, setModal]         = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getCitas().then((data: Cita[]) => setCitas(data.filter(c => clinica.id === 'consolidado' || c.clinicaId === clinica.id)));
  }, [clinica.id]);

  const filtradas = citas.filter(c => filtroEstado === 'Todos' || c.estado === filtroEstado);
  const detalle   = citas.find(c => c.id === detalleId);

  const handleCitaSaved = (saved: Cita) => {
    setCitas(prev => {
      const exists = prev.find(c => c.id === saved.id);
      if (exists) return prev.map(c => c.id === saved.id ? saved : c);
      return [saved, ...prev];
    });
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
    setEditingCita(c);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingCita(null);
  };

  return (
    <div>
      <div className="page-header condensed">
        <h1 className="is-mobile-inline">Citas</h1>
        <div className="action-grid">
          <RoleGuard modulo="citas" accion="crear">
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingCita(null); setModal(true); }}>+ Nueva</button>
          </RoleGuard>
        </div>
      </div>

      <div className="filter-glass" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '8px' }}>
          Estado de la Cita
        </div>
        <div className="filter-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '4px' }}>
          {(['Todos','Pendiente','Confirmada','Completada','Cancelada'] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} className={`btn btn-sm ${filtroEstado === e ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: '10px' }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass overflow-hidden" initial={{ opacity:0, y: 10 }} animate={{ opacity:1, y: 0 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead>
              <tr>
                <th className="col-expand">Paciente y Horario</th>
                <th className="hide-mobile" style={{ width: '180px' }}>Doctor</th>
                <th className="hide-mobile" style={{ width: '200px' }}>Motivo</th>
                <th className="text-center" style={{ width: '140px' }}>Estado</th>
                <th className="text-right" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c, i) => (
                <motion.tr 
                  key={c.id} 
                  initial={{ opacity:0, x: -10 }} 
                  animate={{ opacity:1, x:0 }} 
                  transition={{ delay:i*0.02 }}
                >
                  <td className="col-expand" data-main="true" onClick={() => setDetalleId(c.id)} style={{ cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: '14px', 
                        background: 'linear-gradient(135deg, var(--primary-dim), rgba(255,255,255,0.05))',
                        border: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        📅
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>{c.pacienteNombre}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                          {c.fecha} <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span> {c.hora}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.doctorNombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Especialista</div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      <span style={{ opacity: 0.5, marginRight: '6px' }}>📝</span>
                      {c.motivo}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${ESTADO_CLASE[c.estado]}`} style={{ padding: '4px 12px', minWidth: '100px', justifyContent: 'center' }}>
                      {c.estado.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={(e) => { e.stopPropagation(); setDetalleId(c.id); }} title="Ver Detalle">👁️</button>
                      <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Editar">✏️</button>
                      <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeletingId(c.id); }} title="Eliminar">🗑️</button>
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
      <CitaModal 
        isOpen={modal} 
        onClose={closeModal} 
        onSaved={handleCitaSaved} 
        editingCita={editingCita} 
      />

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
