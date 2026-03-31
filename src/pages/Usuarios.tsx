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
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Gestión de Cuentas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Control de acceso y roles de usuario</p>
        </div>
      </div>

      <div className="filter-glass" style={{ marginBottom: '24px' }}>
        <div className="search-wrap" style={{ width:'100%' }}>
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
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔑</div>
          Cargando perfiles...
        </div>
      ) : (
        <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="table-wrap">
            <table className="table-fixed">
              <thead>
                <tr>
                  <th className="col-expand">Usuario</th>
                  <th className="hide-mobile" style={{ width: '25%' }}>Contacto</th>
                  <th style={{ width: '20%' }}>Rol Asignado</th>
                  <th className="text-center" style={{ width: '150px' }}>Estado</th>
                  <th className="text-right" style={{ width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtrados.map((u, i) => (
                    <motion.tr 
                      key={u.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="col-expand" data-main="true">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: 44, height: 44, borderRadius: '14px', 
                            background: u.activo ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                            boxShadow: u.activo ? '0 4px 10px var(--primary-dim)' : 'none',
                            opacity: u.activo ? 1 : 0.5
                          }}>
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px', opacity: u.activo ? 1 : 0.6 }}>{u.nombre}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{u.activo ? 'Cuenta Activa' : 'Acceso Restringido'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile">
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{u.email}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supabase Auth</div>
                      </td>
                      <td>
                        <select 
                          className="input" 
                          style={{ 
                            padding: '8px 12px', fontSize: '0.82rem', width: 'auto', 
                            minWidth: '150px', background: 'rgba(255,255,255,0.02)',
                            borderRadius: '10px', border: '1px solid var(--border-light)',
                            fontWeight: 700
                          }}
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
                      <td className="text-center">
                        <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`} style={{ minWidth: '90px', justifyContent: 'center', padding: '6px 12px' }}>
                          {u.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                          <button 
                            className={`btn ${u.activo ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                            style={{ width: 32, height: 32, padding: 0 }}
                            onClick={() => handleToggleActivo(u)}
                            disabled={savingId === u.id}
                            title={u.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                          >
                            {u.activo ? '🔒' : '🔓'}
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ width: 32, height: 32, padding: 0, color: 'var(--danger)' }}
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
              <div className="table-empty" style={{ padding: '40px' }}>
                No se encontraron usuarios que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </motion.div>
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
