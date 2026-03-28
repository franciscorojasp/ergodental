// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import { updatePassword, logAuditoria } from '../api';
import { ROL_HOME } from '../permissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot-password' | 'otp-verify' | 'register' | 'register-verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      console.debug('🔐 Intentando inicio de sesión para:', email);
      const u = await login(email, password);
      
      // No bloqueamos el login por el log de auditoría
      logAuditoria({
        usuario: u.nombre,
        accion: 'AUTENTICACIÓN',
        detalle: 'Inicio de sesión exitoso'
      }).catch(err => console.error('Error en log auditoría:', err));

      console.debug('✅ Login exitoso, redireccionando a:', ROL_HOME[u.rol]);
      navigate(ROL_HOME[u.rol] || '/');
    } catch (err: any) {
      console.error('❌ Error de login:', err);
      // Si el usuario no tiene rol o no está activo
      if (err.message.includes('sin perfil')) {
        setError('Tu cuenta está pendiente de aprobación por un administrador.');
      } else {
        setError(err.message || 'Error de conexión o credenciales inválidas');
      }
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await api.signUpNewUser(email, password);
      if (signUpError) throw signUpError;
      
      setSuccess('¡Cuenta creada! Hemos enviado un código a tu Gmail.');
      setTimeout(() => {
        setSuccess('');
        setView('register-verify');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
      setLoading(false);
    }
  };

  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: verifyError } = await api.verifyRegistrationOtp(email, verificationCode);
      if (verifyError) throw verifyError;
      
      setSuccess('¡Correo verificado con éxito! Ahora un administrador debe activar tu cuenta.');
      setTimeout(() => {
        setSuccess('');
        setView('login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Código de verificación inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetPasswordForEmail(email);
      setSuccess('¡Código enviado! Revisa tu bandeja de entrada.');
      setTimeout(() => {
        setSuccess('');
        setView('otp-verify');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al enviar código de recuperación');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await api.verifyRecoveryCode(email, recoveryCode);
      if (verifyError) throw verifyError;
      await updatePassword(newPassword);
      setSuccess('Contraseña actualizada con éxito.');
      setTimeout(() => {
        setSuccess('');
        setView('login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Código inválido o error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: 'radial-gradient(circle at center, #1a1c2c 0%, #0a0b14 100%)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="blobs" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'rgba(52, 144, 220, 0.15)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '50%', filter: 'blur(100px)' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: '100%', maxWidth: '440px', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 100, height: 100, borderRadius: 28, background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '60%', height: '60%', filter: 'drop-shadow(0 0 10px rgba(52, 144, 220, 0.5))' }} />
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', marginBottom: '4px' }}>ERGODENTALVE</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 500 }}>SISTEMA DE GESTIÓN CLÍNICA · <span style={{ color: '#3490dc' }}>1.0</span></p>
        </div>

        <div className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)',
          borderRadius: '32px', padding: '40px', border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
        }}>
          <AnimatePresence mode="wait">
            {view === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
              >
                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>CORREO ELECTRÓNICO</label>
                  <input
                    className="premium-input"
                    type="email"
                    placeholder="ejemplo@ergodental.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px', padding: '16px 20px', color: '#fff', fontSize: '0.95rem',
                      outline: 'none', transition: 'all 0.3s ease'
                    }}
                  />
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>CONTRASEÑA</label>
                    <button type="button" onClick={() => setView('forgot-password')} style={{ color: '#3490dc', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>¿Olvidaste tu contraseña?</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="premium-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px', padding: '16px 20px', color: '#fff', fontSize: '0.95rem',
                        outline: 'none', transition: 'all 0.3s ease'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer'
                      }}
                    >
                      {showPassword ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '10px', borderRadius: '12px' }}>⚠️ {error}</p>}

                <button className="premium-btn" type="submit" disabled={loading} style={{
                  width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)',
                  borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', boxShadow: '0 10px 25px rgba(52, 144, 220, 0.4)', transition: 'transform 0.2s'
                }}>
                  {loading ? 'Identificando...' : 'Iniciar Sesión'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button type="button" onClick={() => setView('register')} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>¿No tienes cuenta? <span style={{ color: '#3490dc', fontWeight: 700 }}>Regístrate</span></button>
                </div>
              </motion.form>
            ) : view === 'register' ? (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSignUp}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h2 style={{ color: '#fff', marginBottom: '4px' }}>Crea tu Cuenta</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Usa un correo Gmail para recibir tu código.</p>
                </div>
                
                <div className="input-group">
                  <input
                    className="premium-input"
                    type="email"
                    placeholder="Tu correo Gmail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <input
                    className="premium-input"
                    type="password"
                    placeholder="Elige una Contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <input
                    className="premium-input"
                    type="password"
                    placeholder="Confirma tu Contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center' }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.85rem', textAlign: 'center' }}>✅ {success}</p>}
                
                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700 }}>
                  {loading ? 'Procesando...' : 'Obtener Código'}
                </button>
                <button type="button" onClick={() => setView('login')} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>¿Ya tienes cuenta? Entrar</button>
              </motion.form>
            ) : view === 'register-verify' ? (
              <motion.form
                key="register-verify"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifySignUp}
                style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ color: '#fff', marginBottom: '8px' }}>Validar Correo</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Introduce el código que enviamos a {email}.</p>
                </div>
                <div className="input-group">
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Código de 8 dígitos"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px', color: '#fff' }}
                  />
                </div>
                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem' }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.85rem' }}>✅ {success}</p>}
                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700 }}>
                  {loading ? 'Verificando...' : 'Activar Cuenta'}
                </button>
              </motion.form>
            ) : view === 'forgot-password' ? (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRequestOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ color: '#fff', marginBottom: '8px' }}>Recuperar</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Ingresa tu correo y te enviaremos un código de seguridad.</p>
                </div>
                <div className="input-group">
                  <input
                    className="premium-input"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px', color: '#fff' }}
                  />
                </div>
                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem' }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.85rem' }}>✅ {success}</p>}
                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: '#3490dc', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700 }}>
                  {loading ? 'Enviando...' : 'Obtener Código'}
                </button>
                <button type="button" onClick={() => setView('login')} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}>Volver</button>
              </motion.form>
            ) : (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyAndUpdate}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h2 style={{ color: '#fff', marginBottom: '4px' }}>Verificar</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Escribe el código y tu nueva contraseña.</p>
                </div>
                
                <div className="input-group">
                  <input
                    className="premium-input"
                    type="text"
                    placeholder="Código de 8 dígitos"
                    value={recoveryCode}
                    onChange={e => setRecoveryCode(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <input
                    className="premium-input"
                    type="password"
                    placeholder="Nueva Contraseña"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <input
                    className="premium-input"
                    type="password"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 20px', color: '#fff' }}
                  />
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '8px', borderRadius: '10px' }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(77,255,77,0.1)', padding: '8px', borderRadius: '10px' }}>✅ {success}</p>}
                
                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700 }}>
                  {loading ? 'Verificando...' : 'Cambiar y Entrar'}
                </button>
                <button type="button" onClick={() => setView('login')} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>¿Recordaste tu clave? Inicia sesión</button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

}
