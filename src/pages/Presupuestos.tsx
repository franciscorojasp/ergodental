import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useMoneda } from '../contexts/MonedaContext';
import { 
  getPresupuestos, createPresupuesto, updatePresupuesto, deletePresupuesto,
  getPacientes, createRecibo, createPago,
  type Presupuesto, type Paciente, type EstadoPresupuesto 
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
      getPacientes()
    ]).then(([presData, pacData]) => {
      setPresupuestos(presData.filter(p => p.clinicaId === clinica.id));
      setPacientes(pacData.filter(p => p.clinicaId === clinica.id));
    }).catch(err => {
      setError('Error al cargar datos: ' + (err.message || err));
    }).finally(() => {
      setLoading(false);
    });
  }, [clinica.id]);

  const duplicadosPac = form.pacienteId ? pacientes.filter(p => p.id === form.pacienteId) : [];
  if (duplicadosPac.length > 1) {
    console.error("CRÍTICO: ID de paciente duplicado detectado en Presupuestos:", form.pacienteId);
  }

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

  const handleSave = async () => {
    if (!form.pacienteId || form.items.some(i => !i.descripcion)) {
      alert('Favor completar el paciente y todas las descripciones de ítems.');
      return;
    }
    setSaving(true);
    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
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
      setModal(false);
      setForm({ pacienteId: '', notas: '', items: [{ id: Math.random().toString(), descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }] });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarRecibo = async (p: Presupuesto) => {
    const metodoInput = prompt('Ingrese el método de pago (Efectivo USD/BS, Pago Móvil, Zelle, etc.):', 'Efectivo USD');
    if (!metodoInput) return;

    setSaving(true);
    try {
      // 1. Crear Recibo
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

      // 2. Crear Pago (Ingreso en Finanzas)
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

      // 3. Actualizar estado del presupuesto
      await updatePresupuesto({ id: p.id, estado: 'Recibido' });

      // 4. Refrescar lista
      const data = await getPresupuestos();
      setPresupuestos(data.filter(px => px.clinicaId === clinica.id));
      alert('Presupuesto cobrado y recibo generado con éxito.');
    } catch (e) {
      alert('Error al generar recibo: ' + e);
    } finally {
      setSaving(false);
    }
  };

  const imprimirPresupuesto = (p: Presupuesto) => {
    generarReportePDF({
      titulo: 'PRESUPUESTO ODONTOLÓGICO',
      subtitulo: `Nro: ${p.id} · Fecha: ${p.fecha}`,
      usuario: 'Administración',
      columnas: ['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal'],
      filas: p.items.map(i => [i.descripcion, i.cantidad, fmt(i.precio), fmt(i.subtotal)]),
      totales: [{ label: 'TOTAL ESTIMADO:', valor: fmt(p.total) }],
      notas: [
        'Este presupuesto tiene una validez de 15 días.',
        'Los precios pueden variar según la complejidad del caso.',
        p.notas || ''
      ]
    });
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
      setPresupuestos(prev => prev.filter(p => (p.id || `idx-${prev.indexOf(p)}`) !== deletingId));
    } catch (e) {
      alert('Error al eliminar presupuesto: ' + e);
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const filtrados = presupuestos.filter(p => filtro === 'Todos' || p.estado === filtro);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header">
        <div>
          <h1>Presupuestos</h1>
          <p>Planes de tratamiento y estimaciones — {clinica.nombreCorto}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)} disabled={loading}>+ Nuevo Presupuesto</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--error)' }}>
          <strong>⚠ Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '10px' }}></div>
          Cargando información clínica...
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
         {(['Todos', 'Borrador', 'Enviado', 'Aprobado', 'Recibido'] as const).map(e => (
           <button key={e} onClick={() => setFiltro(e)} className={`btn btn-sm ${filtro === e ? 'btn-primary' : 'btn-ghost'}`}>
              {e}
           </button>
         ))}
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p, i) => (
              <tr key={p.id || `idx-${i}`}>
                <td><span style={{ fontSize: '0.75rem', fontWeight: 800 }}>#{p.id ? p.id.slice(-6) : 'S/ID'}</span></td>
                <td>{p.fecha}</td>
                <td style={{ fontWeight: 700 }}>{p.pacienteNombre}</td>
                <td>
                   <span className={`badge badge-${p.estado.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{p.estado}</span>
                </td>
                <td style={{ color: 'var(--primary)', fontWeight: 800 }}>{fmt(p.total)}</td>
                <td>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => imprimirPresupuesto(p)} title="Imprimir PDF">📄</button>
                       <RoleGuard modulo="presupuestos" accion="eliminar">
                         <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id || `idx-${i}`)} title="Eliminar" style={{ color:'var(--danger)' }}>🗑️</button>
                       </RoleGuard>
                       {p.estado === 'Borrador' && (
                         <button className="btn btn-ghost btn-sm" onClick={() => {
                           updatePresupuesto({ id: p.id, estado: 'Aprobado' }).then(() => {
                              getPresupuestos().then(data => setPresupuestos(data.filter(px => px.clinicaId === clinica.id)));
                           });
                         }} title="Aprobar">✅</button>
                       )}
                       {p.estado === 'Aprobado' && (
                         <button className="btn btn-ghost btn-sm" onClick={() => handleGenerarRecibo(p)} title="Cobrar y Recibo" style={{ color:'var(--accent)' }}>💳</button>
                       )}
                   </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron presupuestos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && (
          <div className="modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>🛠️ Crear Nuevo Plan de Tratamiento</h3>
                <button className="btn-close" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="label">Paciente</label>
                  <select className="input" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}>
                    <option value="">{pacientes.length === 0 ? 'Cargando pacientes...' : 'Seleccionar paciente...'}</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} ({p.cedula})</option>)}
                  </select>
                  {form.pacienteId && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,198,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      {(() => {
                        const pFound = pacientes.find(px => px.id === form.pacienteId);
                        return pFound ? (
                          <p>👤 <strong>{pFound.nombre} {pFound.apellido}</strong> — C.I: {pFound.cedula} <br/> 📞 {pFound.telefono}</p>
                        ) : <p style={{ color: 'var(--error)' }}>⚠ Paciente no encontrado en la lista actual.</p>;
                      })()}
                    </div>
                  )}
                  {pacientes.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '4px' }}>
                      No se encontraron pacientes para la sede {clinica.nombreCorto}. Verifica que tengan asignada esta sede en el módulo de Pacientes.
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label className="label">Ítems del Presupuesto</label>
                  <table className="table" style={{ marginTop: '8px' }}>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th style={{ width: '80px' }}>Cant.</th>
                        <th style={{ width: '120px' }}>Precio Unit.</th>
                        <th style={{ width: '120px' }}>Subtotal</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map(item => (
                        <tr key={item.id}>
                          <td><input className="input" placeholder="Ej: Resina Simple" value={item.descripcion} onChange={e => updateItem(item.id, 'descripcion', e.target.value)} /></td>
                          <td><input className="input" type="number" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', Number(e.target.value))} /></td>
                          <td><input className="input" type="number" value={item.precio} onChange={e => updateItem(item.id, 'precio', Number(e.target.value))} /></td>
                          <td style={{ fontWeight: 700 }}>{fmt(item.subtotal)}</td>
                          <td><button onClick={() => removeItem(item.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Añadir Línea</button>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Total: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span></div>
                </div>

                <div className="input-group" style={{ marginTop: '20px' }}>
                  <label className="label">Notas Adicionales</label>
                  <textarea className="input" rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones, validez, etc." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                   {saving ? 'Guardando...' : '💾 Generar Presupuesto'}
                </button>
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
        .badge-rechazado { background: rgba(100,100,100,0.1); color: #888; }
        .badge-recibido { background: rgba(123,97,255,0.1); color: #7b61ff; }
      `}</style>
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Eliminar Presupuesto"
        message="¿Está seguro que desea eliminar este presupuesto? Esta acción no se puede deshacer."
        type="danger"
        confirmText={saving ? "Eliminando..." : "Sí, Eliminar"}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
