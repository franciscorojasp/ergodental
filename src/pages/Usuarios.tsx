import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfiles, updateProfile, deleteProfile, type Usuario, type Rol } from '../api';
import { ROL_LABEL } from '../permissions';
import ConfirmDialog from '../components/ConfirmDialog';

const ROLES: Rol[] = ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const data = await getProfiles();
      setUsuarios(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    setSavingId(u.id);
    try {
      const actualizado = await updateProfile({ id: u.id, activo: !u.activo });
      setUsuarios(prev => prev.map(item => item.id === u.id ? actualizado : item));
    } catch (err) {
      alert('Error al actualizar estado');
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeRol = async (u: Usuario, newRol: Rol) => {
    setSavingId(u.id);
    try {
      const actualizado = await updateProfile({ id: u.id, rol: newRol });
      setUsuarios(prev => prev.map(item => item.id === u.id ? actualizado : item));
    } catch (err) {
      alert('Error al cambiar rol');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProfile(deletingId);
      setUsuarios(prev => prev.filter(u => u.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      alert('Error al eliminar perfil');
    }
  };

  const filtrados = usuarios.filter(u => 
    u.email.toLowerCase().includes(busqueda.toLowerCase()) || 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gestión de Cuentas</h1>
          <p>Aprueba nuevos registros y gestiona roles de acceso.</p>
        </div>
      </div>

      <div className="filter-glass animate-fade-in" style={{ marginBottom: '24px' }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input 
            className="input" 
            placeholder="Buscar por correo o nombre..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Cargando perfiles...</div>
      ) : (
        <div className="glass table-wrap animate-fade-in">
          <table className="table-fixed">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '25%' }}>Usuario</th>
                <th className="text-left" style={{ width: '35%' }}>Correo</th>
                <th className="text-left" style={{ width: '20%' }}>Rol asignado</th>
                <th className="text-center" style={{ width: '10%' }}>Estado</th>
                <th className="text-right" style={{ width: '10%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filtrados.map(u => (
                  <motion.tr 
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td className="text-left" data-main="true">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 800, color: '#fff', flexShrink: 0
                        }}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                      </div>
                    </td>
                    <td className="text-left" data-label="Correo"><span style={{ opacity: 0.8, fontSize: '0.9rem' }}>{u.email}</span></td>
                    <td className="text-left" data-label="Rol asignado">
                      <select 
                        className="input" 
                        style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto', minWidth: '140px' }}
                        value={u.rol || ''}
                        onChange={(e) => handleChangeRol(u, e.target.value as Rol)}
                        disabled={savingId === u.id}
                      >
                        <option value="" disabled>Seleccionar Rol</option>
                        {ROLES.map(r => (
                          <option key={r} value={r}>{ROL_LABEL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-center" data-label="Estado">
                      <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`} style={{ minWidth: '80px', justifyContent: 'center' }}>
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="text-right" data-label="Acciones">
                      <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className={`btn ${u.activo ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                          onClick={() => handleToggleActivo(u)}
                          disabled={savingId === u.id}
                          title={u.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                        >
                          {u.activo ? '🔒' : '🔓'}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeletingId(u.id)}
                          title="Eliminar Perfil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div className="table-empty">
              No se encontraron usuarios que coincidan con la búsqueda.
            </div>
          )}
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deletingId}
        title="Eliminar Perfil de Usuario"
        message="¿Está seguro de que desea eliminar este perfil? El usuario perderá el acceso inmediatamente. Esta acción no elimina su cuenta de Supabase Auth, solo su perfil local."
        confirmText="Eliminar Definitivamente"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
