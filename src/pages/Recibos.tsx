import { useEffect, useState } from 'react';
import { useClinica } from '../contexts/ClinicaContext';
import { useMoneda } from '../contexts/MonedaContext';
import { getRecibos, deleteRecibo, type Recibo } from '../api';
import { generarReportePDF } from '../utils/reportes';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleGuard from '../components/RoleGuard';

export default function Recibos() {
  const { clinica } = useClinica();
  const { fmt } = useMoneda();
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecibos().then(data => {
      setRecibos(data.filter(f => f.clinicaId === clinica.id));
      setLoading(false);
    });
  }, [clinica.id]);

  const imprimirRecibo = (r: Recibo) => {
    generarReportePDF({
      titulo: 'RECIBO DE SERVICIOS',
      subtitulo: `Nro: ${r.nroRecibo} · Fecha: ${r.fecha}`,
      usuario: 'Administración',
      columnas: ['Concepto', 'Total'],
      filas: [
        [`Tratamiento vinculado al presupuesto: ${r.presupuestoId || 'N/A'}`, fmt(r.monto)]
      ],
      totales: [
        { label: 'MÉTODO DE PAGO:', valor: r.metodoPago },
        { label: 'TOTAL COBRADO:', valor: fmt(r.monto) }
      ],
      notas: [
        '¡Gracias por confiar en ErgoDental!',
        'Documento emitido para fines administrativos.'
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
      await deleteRecibo(deletingId);
      setRecibos(prev => prev.filter(r => (r.id || `idx-${prev.indexOf(r)}`) !== deletingId));
    } catch (e) {
      alert('Error al eliminar recibo: ' + e);
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header">
        <div>
          <h1>Recibos</h1>
          <p>Registro histórico de cobros y recibos — {clinica.nombreCorto}</p>
        </div>
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nro. Recibo</th>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recibos.map((r, i) => (
              <tr key={r.id || `idx-${i}`}>
                <td><span style={{ fontWeight: 800 }}>{r.nroRecibo}</span></td>
                <td>{r.fecha}</td>
                <td style={{ fontWeight: 700 }}>{r.pacienteNombre}</td>
                <td style={{ color: 'var(--primary)', fontWeight: 800 }}>{fmt(r.monto)}</td>
                <td>{r.metodoPago}</td>
                <td>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <button className="btn btn-ghost btn-sm" onClick={() => imprimirRecibo(r)} title="Reimprimir">📄</button>
                     <RoleGuard modulo="recibos" accion="eliminar">
                       <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id || `idx-${i}`)} title="Anular Recibo" style={{ color:'var(--danger)' }}>🗑️</button>
                     </RoleGuard>
                   </div>
                </td>
              </tr>
            ))}
            {recibos.length === 0 && !loading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se han generado recibos en esta sede.</td></tr>
            )}
            {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Cargando datos...</td></tr>}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Anular Recibo"
        message="¿Está seguro que desea anular este recibo? Esta acción no se puede deshacer y el registro financiero se perderá."
        type="danger"
        confirmText={saving ? "Anulando..." : "Sí, Anular"}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
