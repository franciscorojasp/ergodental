import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useMoneda } from '../contexts/MonedaContext';
import { 
  getPresupuestos, createPresupuesto, updatePresupuesto, deletePresupuesto,
  getPacientes, createRecibo, createPago, getPersonal,
  type Presupuesto, type Paciente, type EstadoPresupuesto, CLINICAS 
} from '../api';
import { generarReportePDF } from '../utils/reportes';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleGuard from '../components/RoleGuard';

export default function Presupuestos() {
  const { clinica } = useClinica();
  const { fmt } = useMoneda();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoPresupuesto | 'Todos'>('Todos');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingPresupuesto, setSharingPresupuesto] = useState<Presupuesto | null>(null);
  const [personal, setPersonal] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [editingPresupuesto, setEditingPresupuesto] = useState<Presupuesto | null>(null);
  const [isMobile] = useState(window.innerWidth < 768);

  const [form, setForm] = useState<{
    pacienteId: string;
    notas: string;
    items: { id: string, descripcion: string, cantidad: number, precio: number, subtotal: number }[];
  }>({
    pacienteId: '',
    notas: '',
    items: [{ id: Math.random().toString(), descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }]
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getPresupuestos(),
      getPacientes(),
      getPersonal()
    ]).then(([presData, pacData, personalData]) => {
      setPresupuestos(presData.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id));
      setPacientes(pacData.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id));
      setPersonal(personalData.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id));
    }).catch(err => {
      setError('Error al cargar datos: ' + (err.message || err));
    }).finally(() => {
      setLoading(false);
    });
  }, [clinica.id]);

  const total = form.items.reduce((acc, curr) => acc + curr.subtotal, 0);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { id: Math.random().toString(), descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }] });
  };

  const updateItem = (id: string, field: string, value: any) => {
    const newItems = form.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.subtotal = updated.cantidad * updated.precio;
        return updated;
      }
      return item;
    });
    setForm({ ...form, items: newItems });
  };

  const removeItem = (id: string) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter(i => i.id !== id) });
  };

  const openEdit = (p: Presupuesto) => {
    setEditingPresupuesto(p);
    setForm({
      pacienteId: p.pacienteId,
      notas: p.notas || '',
      items: (Array.isArray(p.items) ? p.items : (typeof p.items === 'string' ? JSON.parse(p.items || '[]') : [])).map((item: any) => ({ ...item, id: item.id || Math.random().toString() }))
    });
    setModal(true);
  };

  const openNew = () => {
    setEditingPresupuesto(null);
    setForm({ pacienteId: '', notas: '', items: [{ id: Math.random().toString(), descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }] });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.pacienteId || form.items.some(i => !i.descripcion)) {
      alert('Favor completar el paciente y todas las descripciones de ítems.');
      return;
    }
    setSaving(true);
    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
      
      if (editingPresupuesto) {
        await updatePresupuesto({
          id: editingPresupuesto.id,
          pacienteId: form.pacienteId,
          pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : 'Desconocido',
          items: form.items,
          total: total,
          notas: form.notas,
        });
        
        setPresupuestos(prev => prev.map(p => p.id === editingPresupuesto.id ? {
          ...p,
          pacienteId: form.pacienteId,
          pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : 'Desconocido',
          items: form.items,
          total: total,
          notas: form.notas
        } : p));
      } else {
        const nuevo = await createPresupuesto({
          pacienteId: form.pacienteId,
          pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : 'Desconocido',
          clinicaId: clinica.id,
          items: form.items,
          total: total,
          estado: 'Borrador',
          fecha: new Date().toLocaleDateString('en-CA'),
          notas: form.notas
        });
        setPresupuestos([nuevo, ...presupuestos]);
      }
      
      setModal(false);
      setEditingPresupuesto(null);
    } catch (e) {
      alert('Error al guardar presupuesto: ' + e);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarRecibo = async (p: Presupuesto) => {
    const metodoInput = prompt('Ingrese el método de pago:', 'Efectivo USD');
    if (!metodoInput) return;

    setSaving(true);
    try {
      await createRecibo({
        presupuestoId: p.id,
        pacienteId: p.pacienteId,
        pacienteNombre: p.pacienteNombre,
        clinicaId: p.clinicaId,
        monto: p.total,
        metodoPago: metodoInput,
        fecha: new Date().toLocaleDateString('en-CA'),
        nroRecibo: `REC-${Date.now().toString().slice(-6)}`
      });

      await createPago({
        clinicaId: p.clinicaId,
        pacienteId: p.pacienteId,
        pacienteNombre: p.pacienteNombre,
        concepto: `Presupuesto #${p.id.slice(-6)}`,
        monto: p.total,
        montoBs: 0, 
        tasaCambio: 0, 
        moneda: 'USD',
        metodoPago: metodoInput as any,
        referencia: `Plan ${p.id}`,
        tipoPago: 'Contado',
        fecha: new Date().toLocaleDateString('en-CA'),
        estado: 'Pagado'
      });

      await updatePresupuesto({ id: p.id, estado: 'Recibido' });
      const data = await getPresupuestos();
      setPresupuestos(data.filter(px => clinica.id === 'consolidado' || px.clinicaId === clinica.id));
      alert('Pago procesado con éxito.');
    } catch (e) {
      alert('Error al generar recibo: ' + e);
    } finally {
      setSaving(false);
    }
  };

  const imprimirPresupuesto = async (p: Presupuesto) => {
    const sedeNombre = CLINICAS.find(c => c.id === p.clinicaId)?.nombre || clinica.nombre;
    const itemsData = Array.isArray(p.items) ? p.items : (typeof p.items === 'string' ? JSON.parse(p.items || '[]') : []);
    const itemsPDF = itemsData.map((i: any) => [i.descripcion, i.cantidad, fmt(i.precio), fmt(i.subtotal)]);
    await generarReportePDF({
      titulo: 'PRESUPUESTO ODONTOLÓGICO',
      clinica: sedeNombre,
      subtitulo: `Nro: ${p.id} · Fecha: ${p.fecha}`,
      usuario: 'Administración',
      columnas: ['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal'],
      filas: itemsPDF,
      totales: [{ label: 'TOTAL ESTIMADO:', valor: fmt(p.total) }],
      notas: ['Validez: 15 días.', p.notas || '']
    });
  };

  const openShare = (p: Presupuesto) => {
    setSharingPresupuesto(p);
    setSelectedDoctorId('');
    setShareModalOpen(true);
  };

  const getShareText = (p: Presupuesto, destinatarioNombre: string) => {
    const itemsData = Array.isArray(p.items) ? p.items : (typeof p.items === 'string' ? JSON.parse(p.items || '[]') : []);
    const descripciones = itemsData.map((i: any) => i.descripcion).join(', ');
    return `Hola, estimad@ ${destinatarioNombre}, acá te compartimos el presupuesto por ${descripciones}, el monto total es de ${fmt(p.total)}$, favor confirmar la aprobación del mismo por esta vía, millones de gracias por preferirnos.`;
  };

  const handleShareStatus = (p: Presupuesto) => {
    if (p.estado === 'Borrador') {
      updatePresupuesto({ id: p.id, estado: 'Enviado' }).then(() => {
        getPresupuestos().then(data => setPresupuestos(data.filter(px => clinica.id === 'consolidado' || px.clinicaId === clinica.id)));
      });
    }
  };

  const shareViaWhatsApp = (p: Presupuesto, isDoctor: boolean) => {
    let telefono = '';
    let nombre = '';
    if (isDoctor) {
      if (!selectedDoctorId) return alert('Seleccione un médico.');
      const doc = personal.find(x => x.id === selectedDoctorId);
      if (!doc) return;
      telefono = doc.telefono || '';
      nombre = `${doc.nombre} ${doc.apellido}`;
    } else {
      const pac = pacientes.find(x => x.id === p.pacienteId);
      if (!pac) return;
      telefono = pac.telefono || '';
      nombre = `${pac.nombre} ${pac.apellido}`;
    }

    if (!telefono) {
      alert(`El ${isDoctor ? 'médico' : 'paciente'} no tiene un número de teléfono registrado.`);
      return;
    }

    let cleanPhone = telefono.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '58' + cleanPhone.substring(1);
    
    const text = encodeURIComponent(getShareText(p, nombre));
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    if (!isDoctor) handleShareStatus(p);
  };

  const shareViaEmail = (p: Presupuesto, isDoctor: boolean) => {
    let email = '';
    let nombre = '';
    if (isDoctor) {
      if (!selectedDoctorId) return alert('Seleccione un médico.');
      const doc = personal.find(x => x.id === selectedDoctorId);
      if (!doc) return;
      email = doc.email || '';
      nombre = `${doc.nombre} ${doc.apellido}`;
    } else {
      const pac = pacientes.find(x => x.id === p.pacienteId);
      if (!pac) return;
      email = pac.email || '';
      nombre = `${pac.nombre} ${pac.apellido}`;
    }

    if (!email) {
      alert(`El ${isDoctor ? 'médico' : 'paciente'} no tiene un correo registrado.`);
      return;
    }

    const text = encodeURIComponent(getShareText(p, nombre));
    window.open(`mailto:${email}?subject=Presupuesto Odontológico&body=${text}`, '_blank');
    if (!isDoctor) handleShareStatus(p);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setConfirmDeleteOpen(false);
    setSaving(true);
    try {
      await deletePresupuesto(deletingId);
      setPresupuestos(prev => prev.filter(p => p.id !== deletingId));
    } catch (e) { alert('Error: ' + e); }
    finally { setSaving(false); setDeletingId(null); }
  };

  const filtrados = presupuestos.filter(p => filtro === 'Todos' || p.estado === filtro);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Presupuestos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Control de planes de tratamiento y cobros</p>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo Presupuesto</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}>
          <strong>⚠ Error:</strong> {error}
        </div>
      )}

      <div className="filter-glass" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-8px', paddingLeft: '8px' }}>
          Estado del Presupuesto
        </div>
        <div className="filter-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '4px' }}>
          {(['Todos', 'Borrador', 'Enviado', 'Aprobado', 'Recibido'] as const).map(e => (
            <button key={e} onClick={() => setFiltro(e)} className={`btn btn-sm ${filtro === e ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: '10px', minWidth: '110px' }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', opacity: 0.6 }}>
          <div className="spinner" style={{ marginBottom: '14px' }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Cargando protocolos clínicos y presupuestos...</p>
        </div>
      ) : (
        <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="table-wrap">
            <table className="table-fixed">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>ID</th>
                  <th style={{ width: '140px' }}>Fecha</th>
                  <th className="col-expand">Paciente</th>
                  <th className="text-center" style={{ width: '140px' }}>Estado</th>
                  <th style={{ width: '160px' }}>Total</th>
                  <th className="text-right" style={{ width: '180px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <motion.tr key={p.id || `idx-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                    <td><div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'monospace' }}>#{p.id ? p.id.slice(-6).toUpperCase() : 'S/ID'}</div></td>
                    <td><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.fecha}</div></td>
                    <td className="col-expand" data-main="true">
                      <div style={{ fontWeight: 800, fontSize: '1.02rem' }}>{p.pacienteNombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {p.pacienteId.slice(-6)}</div>
                    </td>
                    <td className="text-center">
                      <span className={`badge badge-${p.estado.toLowerCase()}`} style={{ padding: '4px 12px', minWidth: '100px', justifyContent: 'center', fontSize: '0.65rem' }}>{p.estado.toUpperCase()}</span>
                    </td>
                    <td><div style={{ color: 'var(--success)', fontWeight: 900, fontSize: '1.1rem' }}>{fmt(p.total)}</div></td>
                    <td className="text-right">
                      <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={() => imprimirPresupuesto(p)} title="Imprimir PDF">📄</button>
                        <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--primary)' }} onClick={() => openShare(p)} title="Compartir">📤</button>
                        <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={() => openEdit(p)} title="Editar">✏️</button>
                        {p.estado === 'Borrador' && (
                          <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--success)' }} onClick={() => {
                            updatePresupuesto({ id: p.id, estado: 'Aprobado' }).then(() => {
                              getPresupuestos().then(data => setPresupuestos(data.filter(px => clinica.id === 'consolidado' || px.clinicaId === clinica.id)));
                            });
                          }} title="Aprobar">✅</button>
                        )}
                        {p.estado === 'Aprobado' && (
                          <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--accent)' }} onClick={() => handleGenerarRecibo(p)} title="Procesar Pago">💳</button>
                        )}
                        <RoleGuard modulo="presupuestos" accion="eliminar">
                          <button className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }} onClick={() => handleDelete(p.id)} title="Eliminar">🗑️</button>
                        </RoleGuard>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="table-empty">No hay registros en esta categoría.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {shareModalOpen && sharingPresupuesto && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShareModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>📤 Compartir Presupuesto</h3>
                <button className="btn-close" onClick={() => setShareModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <label className="label">Compartir con Paciente</label>
                  <div style={{ fontSize: '0.85rem', marginBottom: '12px' }}>{sharingPresupuesto.pacienteNombre}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none' }} onClick={() => shareViaWhatsApp(sharingPresupuesto, false)}>
                      💬 WhatsApp
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => shareViaEmail(sharingPresupuesto, false)}>
                      📧 Correo
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <label className="label">Compartir con Médico</label>
                  <select className="input" style={{ marginBottom: '12px' }} value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                    <option value="">Seleccione un médico...</option>
                    {personal.filter(p => p.tipo === 'Odontólogo').map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.nombre} {doc.apellido}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none' }} onClick={() => shareViaWhatsApp(sharingPresupuesto, true)}>
                      💬 WhatsApp
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => shareViaEmail(sharingPresupuesto, true)}>
                      📧 Correo
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Nota: Al enviarlo, el mensaje se abrirá pre-llenado. Recuerde adjuntar manualmente el PDF del presupuesto en el chat.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>

        {modal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>{editingPresupuesto ? `✏️ Editar Presupuesto #${editingPresupuesto.id.slice(-6)}` : '🛠️ Nuevo Presupuesto'}</h3>
                <button className="btn-close" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="label">Paciente</label>
                  <select className="input" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}>
                    <option value="">Seleccionar paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                  </select>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <label className="label">Ítems</label>
                  <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="table" style={{ marginTop: '8px' }}>
                      <thead>
                        <tr>
                          <th>Descripción</th>
                          <th style={{ width: '120px' }}>Cant.</th>
                          <th style={{ width: '120px' }}>Precio</th>
                          <th style={{ width: '120px' }}>Total</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map(item => (
                          <tr key={item.id}>
                            <td><input className="input" placeholder="Servicio" value={item.descripcion} onChange={e => updateItem(item.id, 'descripcion', e.target.value)} /></td>
                            <td><input className="input" type="number" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', Number(e.target.value))} /></td>
                            <td><input className="input" type="number" value={item.precio} onChange={e => updateItem(item.id, 'precio', Number(e.target.value))} /></td>
                            <td style={{ fontWeight: 700 }}>{fmt(item.subtotal)}</td>
                            <td><button onClick={() => removeItem(item.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Añadir Línea</button>
                </div>
                <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Total: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span></div>
                </div>
                <div className="input-group" style={{ marginTop: '20px' }}>
                  <label className="label">Notas</label>
                  <textarea className="input" rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Validez, garantía, etc." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .label { display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; margin-bottom: 6px; }
        .badge-borrador { background: rgba(255,107,107,0.1); color: var(--error); }
        .badge-enviado { background: rgba(0,198,255,0.1); color: var(--primary); }
        .badge-aprobado { background: rgba(0,224,150,0.1); color: var(--success); }
        .badge-recibido { background: rgba(123,97,255,0.1); color: #7b61ff; }
      `}</style>
      <ConfirmDialog isOpen={confirmDeleteOpen} title="Eliminar Presupuesto" message="¿Está seguro?" type="danger" confirmText="Eliminar" onConfirm={confirmDelete} onCancel={() => setConfirmDeleteOpen(false)} />
    </div>
  );
}
