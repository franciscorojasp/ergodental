import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getProfiles, 
  updateProfile, 
  createProfile,
  deleteProfile, 
  resetUserPassword,
  CLINICAS,
  type Usuario, 
  type Rol 
} from '../api';
import { ROL_LABEL } from '../permissions';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import CredencialesUsuarioModal from '../components/CredencialesUsuarioModal';

const ROLES: Rol[] = ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'];

const ROL_DESCRIPCIONES: Record<Rol, string> = {
  ADMIN: 'Control total de la clínica, finanzas, inventario, reportes y gestión de usuarios.',
  DOCTOR: 'Acceso clínico: historia clínica, pacientes, citas, odontograma y presupuestos.',
  ASISTENTE: 'Apoyo operativo: consulta de citas, inventario y visualización de odontograma.',
  RECEPCION: 'Front-desk: agenda de citas, registro de nuevos pacientes y control de caja básico.'
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  
  // Modales y acciones
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  
  const [modalPasswordOpen, setModalPasswordOpen] = useState(false);
  const [usuarioParaPassword, setUsuarioParaPassword] = useState<Usuario | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal de Credenciales y QR de Acceso
  const [modalCredencialesOpen, setModalCredencialesOpen] = useState(false);
  const [usuarioParaCredenciales, setUsuarioParaCredenciales] = useState<Usuario | null>(null);
  const [passwordParaCredenciales, setPasswordParaCredenciales] = useState('');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Mensajes de feedback
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  // Formulario de Usuario (Crear / Editar)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'RECEPCION' as Rol,
    clinicaId: 'consolidado',
    permisosMultiClinica: false,
    activo: true,
    password: ''
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol]);

  const abrirModalCredenciales = (u: Usuario, pwdInicial = '') => {
    setUsuarioParaCredenciales(u);
    setPasswordParaCredenciales(pwdInicial);
    setModalCredencialesOpen(true);
  };

  const notificar = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => setFeedback(null), 4000);
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await getProfiles();
      setUsuarios(data);
    } catch (err: any) {
      console.error('Error cargando usuarios:', err);
      notificar('No se pudieron cargar los perfiles de usuario.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirCrearUsuario = () => {
    setUsuarioEditando(null);
    setFormData({
      nombre: '',
      email: '',
      rol: 'DOCTOR',
      clinicaId: 'consolidado',
      permisosMultiClinica: false,
      activo: true,
      password: ''
    });
    setModalUsuarioOpen(true);
  };

  const abrirEditarUsuario = (u: Usuario) => {
    setUsuarioEditando(u);
    setFormData({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol || 'RECEPCION',
      clinicaId: u.clinicaId || 'consolidado',
      permisosMultiClinica: !!u.permisosMultiClinica,
      activo: u.activo,
      password: ''
    });
    setModalUsuarioOpen(true);
  };

  const abrirModalPassword = (u: Usuario) => {
    setUsuarioParaPassword(u);
    setNuevaPassword('');
    setConfirmarPassword('');
    setModalPasswordOpen(true);
  };

  const generarPasswordSegura = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pwd = 'Ergo' + Math.floor(100 + Math.random() * 900) + '$';
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNuevaPassword(pwd);
    setConfirmarPassword(pwd);
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.nombre.trim()) {
      alert('Por favor ingresa nombre y correo electrónico.');
      return;
    }

    setSavingId('guardando');
    try {
      if (usuarioEditando) {
        // Actualizar usuario existente
        const payload: Partial<Usuario> & { id: string; password?: string } = {
          id: usuarioEditando.id,
          nombre: formData.nombre.trim(),
          email: formData.email.trim().toLowerCase(),
          rol: formData.rol,
          clinicaId: formData.clinicaId,
          permisosMultiClinica: formData.permisosMultiClinica,
          activo: formData.activo
        };
        if (formData.password && formData.password.trim().length >= 6) {
          payload.password = formData.password.trim();
        }

        const actualizado = await updateProfile(payload);
        setUsuarios(prev => prev.map(item => item.id === usuarioEditando.id ? { ...item, ...actualizado } : item));
        notificar(`Perfil de ${actualizado.nombre} actualizado correctamente.`);
      } else {
        // Crear nuevo usuario
        if (!formData.password || formData.password.length < 6) {
          alert('Por favor asigna una contraseña inicial de al menos 6 caracteres.');
          setSavingId(null);
          return;
        }

        const nuevo = await createProfile({
          nombre: formData.nombre.trim(),
          email: formData.email.trim().toLowerCase(),
          rol: formData.rol,
          clinicaId: formData.clinicaId,
          permisosMultiClinica: formData.permisosMultiClinica,
          activo: formData.activo,
          password: formData.password
        });
        setUsuarios(prev => [nuevo, ...prev]);
        notificar(`Cuenta creada exitosamente para ${nuevo.nombre}.`);
        setModalUsuarioOpen(false);
        abrirModalCredenciales(nuevo, formData.password);
        return;
      }
      setModalUsuarioOpen(false);
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      notificar(err.message || 'Error al guardar usuario en base de datos.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaPassword) return;
    if (!nuevaPassword || nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    setSavingId(usuarioParaPassword.id);
    try {
      await resetUserPassword(usuarioParaPassword.id, nuevaPassword);
      notificar(`Contraseña restablecida con éxito para ${usuarioParaPassword.email}.`);
      setModalPasswordOpen(false);
      abrirModalCredenciales(usuarioParaPassword, nuevaPassword);
    } catch (err: any) {
      notificar(err.message || 'Error al actualizar contraseña.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    setSavingId(u.id);
    const nuevoEstado = !u.activo;
    try {
      const actualizado = await updateProfile({ id: u.id, activo: nuevoEstado });
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, ...actualizado, activo: nuevoEstado } : item));
      notificar(nuevoEstado ? `Acceso concedido para ${u.nombre}.` : `Cuenta de ${u.nombre} suspendida.`);
    } catch (err) {
      notificar('Error al actualizar estado de la cuenta.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeRol = async (u: Usuario, newRol: Rol) => {
    setSavingId(u.id);
    try {
      const actualizado = await updateProfile({ id: u.id, rol: newRol });
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, ...actualizado, rol: newRol } : item));
      notificar(`Rol de ${u.nombre} actualizado a ${ROL_LABEL[newRol]}.`);
    } catch (err) {
      notificar('Error al cambiar rol del usuario.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProfile(deletingId);
      setUsuarios(prev => prev.filter(u => u.id !== deletingId));
      notificar('Perfil eliminado de la base de datos.');
      setDeletingId(null);
    } catch (err: any) {
      notificar(err.message || 'Error al eliminar el usuario.', 'error');
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    const coincideTexto = 
      (u.email || '').toLowerCase().includes(busqueda.toLowerCase()) || 
      (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    
    if (!coincideTexto) return false;

    if (filtroRol === 'TODOS') return true;
    if (filtroRol === 'PENDIENTES') return !u.activo;
    return u.rol === filtroRol;
  });

  const totalPaginas = Math.ceil(usuariosFiltrados.length / pageSize) || 1;
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * pageSize,
    paginaActual * pageSize
  );

  // Métricas
  const totalCuentas = usuarios.length;
  const cuentasActivas = usuarios.filter(u => u.activo).length;
  const cuentasPendientes = usuarios.filter(u => !u.activo).length;
  const totalDoctores = usuarios.filter(u => u.rol === 'DOCTOR').length;

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
              padding: '14px 24px', borderRadius: '16px', fontWeight: 600,
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
              background: feedback.tipo === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
              color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
            }}
          >
            <span>{feedback.tipo === 'success' ? '✅' : '⚠️'}</span>
            <span>{feedback.mensaje}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Principal */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '4px' }}>Gestión de Cuentas y Accesos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control de roles, asignación de sedes clínicas y activación de personal</p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={abrirCrearUsuario}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '12px 20px', borderRadius: '14px', fontWeight: 700 
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>➕</span>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CUENTAS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginTop: '4px' }}>{totalCuentas}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Personal y administración</div>
        </div>

        <div className="glass" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>CUENTAS ACTIVAS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>{cuentasActivas}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Con acceso clínico habilitado</div>
        </div>

        <div 
          className="glass" 
          onClick={() => setFiltroRol(cuentasPendientes > 0 ? 'PENDIENTES' : 'TODOS')}
          style={{ 
            padding: '18px 20px', borderRadius: '18px', cursor: 'pointer',
            border: cuentasPendientes > 0 ? '1px solid #f59e0b' : '1px solid var(--border-light)',
            background: cuentasPendientes > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined
          }}
        >
          <div style={{ fontSize: '0.8rem', color: cuentasPendientes > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>
            {cuentasPendientes > 0 ? '🔔 PENDIENTES DE APROBACIÓN' : 'PENDIENTES'}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: cuentasPendientes > 0 ? '#f59e0b' : '#fff', marginTop: '4px' }}>
            {cuentasPendientes}
          </div>
          <div style={{ fontSize: '0.75rem', color: cuentasPendientes > 0 ? '#f59e0b' : 'var(--text-secondary)', marginTop: '2px' }}>
            {cuentasPendientes > 0 ? 'Click para filtrar y activar' : 'Todas las cuentas activas'}
          </div>
        </div>

        <div className="glass" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>ODONTÓLOGOS / MÉDICOS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>{totalDoctores}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Acceso a historias y odontograma</div>
        </div>
      </div>

      {/* Buscador y Pestañas de Filtro */}
      <div className="filter-glass" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="search-wrap" style={{ width: '100%' }}>
          <span className="search-icon">🔍</span>
          <input 
            className="input" 
            placeholder="Buscar cuenta por nombre, doctor, correo o rol..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>

        {/* Pestañas de Roles */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className={`btn btn-sm ${filtroRol === 'TODOS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('TODOS')}
            style={{ borderRadius: '10px' }}
          >
            Todos ({totalCuentas})
          </button>
          
          <button 
            className={`btn btn-sm ${filtroRol === 'PENDIENTES' ? 'btn-warning' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('PENDIENTES')}
            style={{ 
              borderRadius: '10px',
              color: filtroRol !== 'PENDIENTES' && cuentasPendientes > 0 ? '#f59e0b' : undefined
            }}
          >
            ⏳ Pendientes / Inactivos ({cuentasPendientes})
          </button>

          <button 
            className={`btn btn-sm ${filtroRol === 'ADMIN' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('ADMIN')}
            style={{ borderRadius: '10px' }}
          >
            🛡️ Administradores
          </button>

          <button 
            className={`btn btn-sm ${filtroRol === 'DOCTOR' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('DOCTOR')}
            style={{ borderRadius: '10px' }}
          >
            👨‍⚕️ Doctores
          </button>

          <button 
            className={`btn btn-sm ${filtroRol === 'ASISTENTE' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('ASISTENTE')}
            style={{ borderRadius: '10px' }}
          >
            🩺 Asistentes
          </button>

          <button 
            className={`btn btn-sm ${filtroRol === 'RECEPCION' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltroRol('RECEPCION')}
            style={{ borderRadius: '10px' }}
          >
            🖥️ Recepción
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '14px' }}>🔄</div>
          <div style={{ fontWeight: 600 }}>Cargando directorio de cuentas y permisos...</div>
        </div>
      ) : (
        <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: '24px' }}>
          <div className="table-wrap">
            <table className="table-fixed">
              <thead>
                <tr>
                  <th className="col-expand" style={{ minWidth: '220px' }}>Usuario Clínico</th>
                  <th style={{ width: '22%' }}>Rol y Permisos</th>
                  <th className="hide-mobile" style={{ width: '18%' }}>Sede Asignada</th>
                  <th className="text-center" style={{ width: '150px' }}>Estado</th>
                  <th className="text-right" style={{ width: '180px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {usuariosPaginados.map((u, i) => {
                    const clinicaAsignada = CLINICAS.find(c => c.id === u.clinicaId);
                    return (
                      <motion.tr 
                        key={u.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{ background: !u.activo ? 'rgba(245, 158, 11, 0.03)' : undefined }}
                      >
                        {/* Usuario */}
                        <td className="col-expand" data-main="true">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ 
                              width: 44, height: 44, borderRadius: '14px', 
                              background: u.activo 
                                ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
                                : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                              boxShadow: u.activo ? '0 4px 12px rgba(0, 198, 255, 0.25)' : 'none',
                              opacity: u.activo ? 1 : 0.6
                            }}>
                              {u.nombre ? u.nombre.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {u.nombre || 'Sin nombre asignado'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Selector de Rol */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select 
                              className="input" 
                              style={{ 
                                padding: '6px 10px', fontSize: '0.82rem', width: '100%', 
                                maxWidth: '200px', background: 'rgba(0,0,0,0.25)',
                                borderRadius: '10px', border: '1px solid var(--border-light)',
                                fontWeight: 700
                              }}
                              value={u.rol || 'RECEPCION'}
                              onChange={(e) => handleChangeRol(u, e.target.value as Rol)}
                              disabled={savingId === u.id}
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r}>{ROL_LABEL[r]}</option>
                              ))}
                            </select>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {ROL_DESCRIPCIONES[u.rol] || 'Acceso básico'}
                            </span>
                          </div>
                        </td>

                        {/* Sede Asignada */}
                        <td className="hide-mobile">
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '8px' }}>
                            🏥 {clinicaAsignada ? clinicaAsignada.nombreCorto : 'Consolidado Global'}
                          </span>
                          {u.permisosMultiClinica && (
                            <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--primary)', marginTop: '3px' }}>
                              ✨ Multisede autorizado
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="text-center">
                          {u.activo ? (
                            <span className="badge badge-success" style={{ minWidth: '85px', justifyContent: 'center', padding: '6px 10px' }}>
                              ● ACTIVO
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <span className="badge badge-warning" style={{ minWidth: '85px', justifyContent: 'center', padding: '6px 10px' }}>
                                ⏳ PENDIENTE
                              </span>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleToggleActivo(u)}
                                disabled={savingId === u.id}
                                style={{
                                  fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981'
                                }}
                              >
                                Aprobar Acceso
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="text-right">
                          <div className="action-grid" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                            <button 
                              className="btn btn-ghost btn-sm"
                              style={{ width: 34, height: 34, padding: 0 }}
                              onClick={() => abrirEditarUsuario(u)}
                              title="Editar Perfil y Sede"
                            >
                              ✏️
                            </button>

                            <button 
                              className="btn btn-ghost btn-sm"
                              style={{ width: 34, height: 34, padding: 0 }}
                              onClick={() => abrirModalCredenciales(u)}
                              title="Credenciales Oficiales y Código QR de Acceso"
                            >
                              🪪
                            </button>

                            <button 
                              className="btn btn-ghost btn-sm"
                              style={{ width: 34, height: 34, padding: 0 }}
                              onClick={() => abrirModalPassword(u)}
                              title="Cambiar o Resetear Contraseña"
                            >
                              🔑
                            </button>

                            <button 
                              className={`btn ${u.activo ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                              style={{ width: 34, height: 34, padding: 0 }}
                              onClick={() => handleToggleActivo(u)}
                              disabled={savingId === u.id}
                              title={u.activo ? 'Suspender Acceso' : 'Activar Cuenta'}
                            >
                              {u.activo ? '🔒' : '🔓'}
                            </button>

                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ width: 34, height: 34, padding: 0, color: 'var(--danger)' }}
                              onClick={() => setDeletingId(u.id)}
                              title="Eliminar Cuenta"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <div className="table-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>No se encontraron cuentas</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  No hay usuarios que coincidan con la búsqueda o el filtro seleccionado.
                </p>
              </div>
            )}
          </div>

          <Pagination 
            currentPage={paginaActual}
            totalPages={totalPaginas}
            totalItems={usuariosFiltrados.length}
            pageSize={pageSize}
            onPageChange={setPaginaActual}
            onPageSizeChange={setPageSize}
          />
        </motion.div>
      )}

      {/* MODAL: CREAR / EDITAR USUARIO */}
      <AnimatePresence>
        {modalUsuarioOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setModalUsuarioOpen(false); }}
            style={{ zIndex: 10000, background: 'rgba(5, 8, 20, 0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ maxWidth: '520px', width: '100%', borderRadius: '24px' }}
            >
              <div className="modal-header" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                    {usuarioEditando ? 'Editar Perfil de Usuario' : 'Crear Nuevo Usuario Clínico'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                    {usuarioEditando ? 'Modifica los permisos y roles de la cuenta' : 'Asigna rol, sede y credenciales de acceso'}
                  </p>
                </div>
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setModalUsuarioOpen(false)}
                  style={{ fontSize: '1.2rem', padding: '4px 10px' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarUsuario}>
                <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Nombre Completo */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>NOMBRE COMPLETO</label>
                    <input 
                      className="input" 
                      type="text" 
                      required 
                      placeholder="Ej. Dr. Andrés Hernández"
                      value={formData.nombre} 
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>CORREO ELECTRÓNICO (GMAIL)</label>
                    <input 
                      className="input" 
                      type="email" 
                      required 
                      placeholder="correo@ejemplo.com"
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Rol Clínico */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>ROL Y NIVEL DE ACCESO</label>
                    <select 
                      className="input"
                      value={formData.rol}
                      onChange={e => setFormData({ ...formData, rol: e.target.value as Rol })}
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROL_LABEL[r]}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {ROL_DESCRIPCIONES[formData.rol]}
                    </p>
                  </div>

                  {/* Sede Asignada */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>SEDE CLÍNICA PRINCIPAL</label>
                      <select 
                        className="input"
                        value={formData.clinicaId}
                        onChange={e => setFormData({ ...formData, clinicaId: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        {CLINICAS.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.permisosMultiClinica}
                        onChange={e => setFormData({ ...formData, permisosMultiClinica: e.target.checked })}
                      />
                      <span>Permitir alternar entre múltiples sedes clínicas</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.activo}
                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                      />
                      <span>Cuenta Activa (Habilitar inicio de sesión inmediato)</span>
                    </label>
                  </div>

                  {/* Contraseña (requerida al crear, opcional al editar) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      {usuarioEditando ? 'NUEVA CONTRASEÑA (Dejar en blanco para mantener la actual)' : 'CONTRASEÑA INICIAL'}
                    </label>
                    {/* Honeypot anti-autofill */}
                    <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                      <input type="text" name="chrome_prevent_form_usr" tabIndex={-1} autoComplete="off" />
                      <input type="password" name="chrome_prevent_form_pwd" tabIndex={-1} autoComplete="off" />
                    </div>
                    <input 
                      className="input" 
                      type="password" 
                      placeholder={usuarioEditando ? '•••••••• (Sin cambios)' : 'Mínimo 6 caracteres'}
                      value={formData.password} 
                      onChange={e => setFormData({ ...formData, password: e.target.value })} 
                      required={!usuarioEditando}
                      autoComplete="new-password"
                      name="admin_user_form_pwd"
                      id="admin_user_form_pwd"
                      data-lpignore="true"
                      data-form-type="other"
                      style={{ width: '100%' }}
                    />
                  </div>

                </div>

                <div className="modal-footer" style={{ padding: '18px 28px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setModalUsuarioOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={savingId === 'guardando'}
                  >
                    {savingId === 'guardando' ? 'Guardando...' : (usuarioEditando ? 'Guardar Cambios' : 'Crear Usuario')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CAMBIO RÁPIDO DE CONTRASEÑA */}
      <AnimatePresence>
        {modalPasswordOpen && usuarioParaPassword && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setModalPasswordOpen(false); }}
            style={{ zIndex: 10000, background: 'rgba(5, 8, 20, 0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ maxWidth: '440px', width: '100%', borderRadius: '24px' }}
            >
              <div className="modal-header" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Restablecer Contraseña</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                    Para: <strong style={{ color: '#fff' }}>{usuarioParaPassword.email}</strong>
                  </p>
                </div>
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setModalPasswordOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarPassword}>
                <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>NUEVA CONTRASEÑA</label>
                      <button 
                        type="button"
                        onClick={generarPasswordSegura}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        🎲 Generar segura
                      </button>
                    </div>
                    <input 
                      className="input" 
                      type="text" 
                      required 
                      placeholder="Nueva contraseña"
                      value={nuevaPassword} 
                      onChange={e => setNuevaPassword(e.target.value)} 
                      autoComplete="new-password"
                      name="admin_reset_user_pwd_1"
                      id="admin_reset_user_pwd_1"
                      data-lpignore="true"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>CONFIRMAR CONTRASEÑA</label>
                    <input 
                      className="input" 
                      type="text" 
                      required 
                      placeholder="Repite la nueva contraseña"
                      value={confirmarPassword} 
                      onChange={e => setConfirmarPassword(e.target.value)} 
                      autoComplete="new-password"
                      name="admin_reset_user_pwd_2"
                      id="admin_reset_user_pwd_2"
                      data-lpignore="true"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {nuevaPassword && (
                    <div style={{ 
                      padding: '10px 14px', borderRadius: '12px', background: 'rgba(0, 198, 255, 0.08)', 
                      border: '1px solid var(--primary-dim)', fontSize: '0.8rem' 
                    }}>
                      💡 Asegúrate de compartir esta clave de acceso con el usuario de manera segura.
                    </div>
                  )}

                </div>

                <div className="modal-footer" style={{ padding: '18px 28px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setModalPasswordOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={savingId === usuarioParaPassword.id}
                  >
                    {savingId === usuarioParaPassword.id ? 'Actualizando...' : 'Guardar Clave'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIÁLOGO CONFIRMAR ELIMINACIÓN */}
      <ConfirmDialog 
        isOpen={!!deletingId}
        title="Eliminar Cuenta de Usuario"
        message="¿Está seguro de que desea eliminar este perfil? El usuario perderá el acceso inmediatamente al sistema clínico."
        confirmText="Eliminar Definitivamente"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* MODAL: CREDENCIALES Y QR DE ACCESO */}
      <CredencialesUsuarioModal 
        isOpen={modalCredencialesOpen}
        onClose={() => setModalCredencialesOpen(false)}
        usuario={usuarioParaCredenciales}
        initialPassword={passwordParaCredenciales}
        onPasswordUpdated={(_id, _nuevaClave) => {
          notificar('Contraseña de usuario sincronizada en el sistema.');
        }}
      />
    </div>
  );
}
