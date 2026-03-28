// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import { updatePassword } from '../api';
import { IS_DEMO_MODE, logAuditoria } from '../api';
import { ROL_HOME } from '../permissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localStorage.getItem('ergo_clinica_activa')) {
      setError('Por favor selecciona una sede antes de continuar');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      // Registrar en auditoría
      try {
        await logAuditoria({
          usuario: loggedUser.nombre || loggedUser.email,
          accion: 'INICIO DE SESIÓN',
          detalle: 'Autenticación exitosa en el sistema'
        });
      } catch (e) {}
      navigate(ROL_HOME[loggedUser.rol], { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recoveryCode || !newPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      // 1. Verificamos el código OTP
      const { error: verifyError } = await api.verifyRecoveryCode(email, recoveryCode);
      if (verifyError) throw verifyError;

      // 2. Si es válido, actualizamos la contraseña
      await updatePassword(newPassword);
      
      setSuccess('Contraseña actualizada con éxito. Ya puedes iniciar sesión.');
      setTimeout(() => {
        setView('login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const DEMO_ACCOUNTS = [
    { label: '🛡️ Admin',      email: 'admin@ergodental.com',     icon: '🛡️' },
    { label: '👨‍⚕️ Doctor',    email: 'doctor@ergodental.com',    icon: '👨‍⚕️' },
    { label: '🩺 Asistente',  email: 'asistente@ergodental.com', icon: '🩺' },
    { label: '🖥️ Recepción',  email: 'recepcion@ergodental.com', icon: '🖥️' },
  ];

  const fillDemo = (email?: string) => {
    setEmail(email || 'admin@ergodental.com');
    setPassword('Ergodental2024!');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 90, height: 90, borderRadius: 24,
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              overflow: 'hidden', border: '2px solid var(--border)'
            }}
          >
            <img src="/logo.png" alt="Ergodental Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>ERGODENTALVE</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '1rem', fontWeight: 600 }}>1.0</p>
        </div>

        {/* Tarjeta */}
        <div className="glass" style={{ padding: '32px' }}>
          {view === 'login' ? (
            <>
              {IS_DEMO_MODE && (
                <div style={{
                  background: 'var(--warning-dim)', border: '1px solid var(--warning)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                  marginBottom: '20px', fontSize: '0.8rem', color: 'var(--warning)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', fontWeight:600 }}>
                    <span>⚡</span> Modo Demo — selecciona un perfil:
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
                    {DEMO_ACCOUNTS.map(acc => (
                      <button key={acc.email} onClick={() => fillDemo(acc.email)}
                        style={{
                          background: email === acc.email ? 'var(--warning)' : 'transparent',
                          color: email === acc.email ? '#000' : 'var(--warning)',
                          border: '1px solid var(--warning)', borderRadius: '6px',
                          padding: '4px 10px', cursor: 'pointer',
                          fontSize: '0.78rem', fontWeight: 600, transition: 'var(--transition)',
                          flex: '1 1 auto', textAlign: 'center'
                        }}>
                        {acc.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop:'8px', fontSize:'0.75rem', opacity:0.8 }}>
                    Contraseña: <code>Ergodental2024!</code>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="input-group">
                  <label>Correo electrónico</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="correo@ergodental.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Contraseña</label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot-password'); setError(''); setSuccess(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      background: 'var(--danger-dim)', border: '1px solid var(--danger)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                      fontSize: '0.85rem', color: 'var(--danger)',
                    }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Restablecer Contraseña</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Ingresa tu correo, el código de 8 dígitos que recibiste y tu nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="input-group">
                  <label>Correo electrónico</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="correo@ergodental.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Código de Verificación (8 dígitos)</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="12345678"
                    value={recoveryCode}
                    onChange={e => setRecoveryCode(e.target.value)}
                    maxLength={8}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Nueva Contraseña</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      background: 'var(--danger-dim)', border: '1px solid var(--danger)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                      fontSize: '0.85rem', color: 'var(--danger)',
                    }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      background: 'var(--success-dim)', border: '1px solid var(--success)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                      fontSize: '0.85rem', color: 'var(--success)',
                    }}
                  >
                    ✅ {success}
                  </motion.div>
                )}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                  {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                </button>

                <button 
                  className="btn btn-secondary" 
                  type="button" 
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                >
                  Volver al inicio de sesión
                </button>
              </form>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © 2026 Ergodental · Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  );
}
