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
      <div className="page-header">
        <div>
          <h1>Citas</h1>
          <p style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="badge badge-primary" style={{ fontSize:'0.7rem' }}>{clinica.nombreCorto}</span>
            {filtradas.length} citas encontradas
          </p>
        </div>
        <div className="action-grid">
          <RoleGuard modulo="citas" accion="crear">
            <button className="btn btn-primary" onClick={() => { setEditingCita(null); setModal(true); }}>+ Nueva Cita</button>
          </RoleGuard>
        </div>
      </div>

      <div className="filter-glass">
        <div className="filter-grid">
          {(['Todos','Pendiente','Confirmada','Completada','Cancelada'] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} className={`btn btn-sm ${filtroEstado === e ? 'btn-primary' : 'btn-ghost'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <motion.div className="glass" initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead><tr>
              <th className="text-left" style={{ width: '15%' }}>Fecha/Hora</th>
              <th className="text-left col-expand" style={{ width: '35%' }}>Paciente</th>
              <th className="text-left hide-mobile" style={{ width: '20%' }}>Doctor</th>
              <th className="text-left hide-mobile" style={{ width: '15%' }}>Motivo</th>
              <th className="text-center" style={{ width: '10%' }}>Estado</th>
              <th className="text-right" style={{ width: '5%' }}>Acciones</th>
            </tr></thead>
            <tbody>
              {filtradas.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}>
                  <td className="text-left" data-label="Fecha/Hora" onClick={() => setDetalleId(c.id)} style={{ cursor:'pointer' }}>
                    <div style={{ fontWeight:700 }}>{c.fecha}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{c.hora}</div>
                  </td>
                  <td className="text-left col-expand" data-main="true">{c.pacienteNombre}</td>
                  <td className="text-left hide-mobile" data-label="Doctor">{c.doctorNombre}</td>
                  <td className="text-left hide-mobile" data-label="Motivo" style={{ fontSize:'0.85rem', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.motivo}</td>
                  <td className="text-center" data-label="Estado"><span className={`badge ${ESTADO_CLASE[c.estado]}`}>{c.estado}</span></td>
                  <td className="text-right">
                    <div style={{ display:'flex', gap:'8px', justifyContent: 'flex-end' }}>
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
