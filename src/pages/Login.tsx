// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import type { Rol } from '../api';
import { logAuditoria } from '../api';
import { ROL_HOME, ROL_LABEL } from '../permissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<'login' | 'forgot-password' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState<Rol>('RECEPCION');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Detección de escaneo QR y auto-llenado desde Gestión de Cuentas
  const [qrDetectado, setQrDetectado] = useState(false);
  const [qrRol, setQrRol] = useState<string | null>(null);

  useEffect(() => {
    let uParam = searchParams.get('user') || searchParams.get('email');
    let pParam = searchParams.get('pwd') || searchParams.get('password');
    let rParam = searchParams.get('role');
    const isQr = searchParams.get('qr') === '1';

    // Soporte para parámetros en hash de HashRouter (#/login?user=...)
    if (!uParam) {
      const hash = window.location.hash;
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const hp = new URLSearchParams(hash.slice(qIndex));
        uParam = uParam || hp.get('user') || hp.get('email');
        pParam = pParam || hp.get('pwd') || hp.get('password');
        rParam = rParam || hp.get('role');
      }
    }

    if (uParam) {
      setEmail(uParam);
      if (pParam) {
        setPassword(pParam);
      }
      if (rParam) {
        setQrRol(rParam);
      }
      if (isQr || pParam) {
        setQrDetectado(true);
      }
    }
  }, [searchParams]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      logAuditoria({
        usuario: u.nombre,
        accion: 'AUTENTICACIÓN',
        detalle: 'Inicio de sesión exitoso'
      }).catch(err => console.error('Error en log auditoría:', err));

      navigate(ROL_HOME[u.rol] || '/');
    } catch (err: any) {
      if (err.message && err.message.includes('sin perfil')) {
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
    setSuccess('');
    if (!email.trim() || !password) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await api.signUpNewUser({
        nombre: nombre.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        password,
        rol: rolSolicitado
      });
      if (signUpError) throw signUpError;

      setSuccess('¡Cuenta registrada exitosamente! Por seguridad clínica, tu acceso debe ser activado por un Administrador.');
      setNombre('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess('');
        setView('login');
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Error al registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  // Solicitar restablecimiento a Administración vía WhatsApp
  const handleSolicitarPorWhatsApp = () => {
    const correoSolicitante = email.trim() || '[Correo no especificado]';
    const msg = `🦷 *SOLICITUD DE RESTABLECIMIENTO DE ACCESO · ERGODENTALVE* 🦷\n\nHola Administración, solicito el restablecimiento de mi contraseña o el envío de mi Carnet con Código QR de acceso.\n\n👤 *Usuario / Correo:* ${correoSolicitante}\n\nPor favor facilítenme mis credenciales actualizadas a través de este medio. ¡Muchas gracias!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Solicitar restablecimiento a Administración vía Correo
  const handleSolicitarPorCorreo = () => {
    const correoSolicitante = email.trim() || '[Correo no especificado]';
    const asunto = `Solicitud de Restablecimiento de Credenciales - ${correoSolicitante}`;
    const cuerpo = `Hola Administración de ErgoDentalVE,\n\nSolicito el restablecimiento de mi contraseña o el envío de mi carnet con Código QR para el usuario:\n\nUsuario / Correo: ${correoSolicitante}\n\nQuedo atento a sus indicaciones.\n\nSaludos cordiales.`;
    window.location.href = `mailto:admin@ergodentalve.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
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
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: 90, height: 90, borderRadius: 26, background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '60%', height: '60%', filter: 'drop-shadow(0 0 10px rgba(52, 144, 220, 0.5))' }} />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', marginBottom: '4px' }}>ERGODENTALVE</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', fontWeight: 500 }}>SISTEMA DE GESTIÓN CLÍNICA · <span style={{ color: '#3490dc' }}>1.0.7</span></p>
        </div>

        <div className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)',
          borderRadius: '32px', padding: '36px 32px', border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
        }}>
          <AnimatePresence mode="wait">
            {/* VISTA 1: INICIO DE SESIÓN */}
            {view === 'login' && (
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* BANNER DE ACCESO POR QR */}
                {qrDetectado && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 198, 255, 0.12), rgba(0, 114, 255, 0.12))',
                    border: '1px solid #00c6ff',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>📲</div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>
                      Acceso mediante Código QR
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                      Credenciales cargadas para <strong>{email}</strong> {qrRol ? `· ${qrRol}` : ''}
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 600 }}>CORREO ELECTRÓNICO</label>
                  <input id="login-email" name="email" className="premium-input" type="email" placeholder="ejemplo@ergodentalve.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 18px', color: '#fff' }} />
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 600 }}>CONTRASEÑA</label>
                    <button type="button" onClick={() => { setError(''); setSuccess(''); setView('forgot-password'); }} style={{ color: '#3490dc', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>¿Olvidaste tu contraseña?</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input id="login-password" name="password" className="premium-input" type={showPassword ? "text" : "password"} placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 44px 14px 18px', color: '#fff' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>{showPassword ? '👁️' : '🔒'}</button>
                  </div>
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.84rem', textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '10px', borderRadius: '12px', margin: 0 }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.84rem', textAlign: 'center', background: 'rgba(77,255,77,0.1)', padding: '10px', borderRadius: '12px', margin: 0 }}>✅ {success}</p>}

                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>
                  {loading ? 'Identificando...' : (qrDetectado && password ? '⚡ Iniciar Sesión con QR' : 'Iniciar Sesión')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <button type="button" onClick={() => { setError(''); setSuccess(''); setView('register'); }} style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    ¿No tienes cuenta? <span style={{ color: '#3490dc', fontWeight: 700 }}>Regístrate</span>
                  </button>
                </div>
              </motion.form>
            )}

            {/* VISTA 2: RECUPERACIÓN / CONTACTO CON ADMINISTRACIÓN (SIN SUPABASE) */}
            {view === 'forgot-password' && (
              <motion.div key="forgot" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>🛡️</div>
                  <h2 style={{ color: '#fff', margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Recuperación de Acceso</h2>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '6px', lineHeight: 1.5 }}>
                    Por seguridad y control clínico, el restablecimiento de contraseñas es gestionado directamente por la <strong>Administración</strong> a través del panel de Gestión de Cuentas.
                  </p>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginBottom: '6px', fontWeight: 600 }}>TU CORREO ELECTRÓNICO REGISTRADO</label>
                  <input
                    className="premium-input"
                    type="email"
                    placeholder="ejemplo@ergodentalve.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="premium-btn"
                    onClick={handleSolicitarPorWhatsApp}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      borderRadius: '14px',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📲</span>
                    <span>Solicitar por WhatsApp a Administración</span>
                  </button>

                  <button
                    type="button"
                    className="premium-btn"
                    onClick={handleSolicitarPorCorreo}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>✉️</span>
                    <span>Solicitar por Correo a Administración</span>
                  </button>
                </div>

                <div style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(0, 198, 255, 0.06)',
                  border: '1px solid rgba(0, 198, 255, 0.2)',
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.4,
                  textAlign: 'center'
                }}>
                  💡 <strong>¿Ya te enviaron tu clave temporal o código QR?</strong>
                  <div style={{ marginTop: '4px' }}>
                    Escanea el código QR con tu cámara o ingresa con la clave temporal proporcionada.
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => { setError(''); setSuccess(''); setView('login'); }}
                    style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </motion.div>
            )}

            {/* VISTA 3: REGISTRO DE CUENTA */}
            {view === 'register' && (
              <motion.form key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Crea tu Cuenta</h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '3px' }}>Registro de acceso al sistema clínico</p>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>NOMBRE Y APELLIDO</label>
                  <input id="reg-nombre" name="nombre" className="premium-input" type="text" placeholder="Ej. Dr. Carlos Silva" value={nombre} onChange={e => setNombre(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff' }} />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>CORREO ELECTRÓNICO</label>
                  <input id="reg-email" name="email" className="premium-input" type="email" placeholder="ejemplo@ergodentalve.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff' }} />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>ROL EN LA CLÍNICA</label>
                  <select id="reg-rol" name="rol" className="premium-input" value={rolSolicitado} onChange={e => setRolSolicitado(e.target.value as Rol)} style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff' }}>
                    <option value="DOCTOR">👨‍⚕️ {ROL_LABEL['DOCTOR']}</option>
                    <option value="ASISTENTE">🩺 {ROL_LABEL['ASISTENTE']}</option>
                    <option value="RECEPCION">🖥️ {ROL_LABEL['RECEPCION']}</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <input id="reg-password" name="password" className="premium-input" type={showRegPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 42px 12px 16px', color: '#fff' }} />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>{showRegPassword ? '👁️' : '🔒'}</button>
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>CONFIRMAR CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <input id="reg-confirm" name="confirmPassword" className="premium-input" type={showConfirmPassword ? "text" : "password"} placeholder="Repite la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 42px 12px 16px', color: '#fff' }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>{showConfirmPassword ? '👁️' : '🔒'}</button>
                  </div>
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.82rem', textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '8px', borderRadius: '10px', margin: 0 }}>⚠️ {error}</p>}
                {success && <p style={{ color: '#4dff4d', fontSize: '0.82rem', textAlign: 'center', background: 'rgba(77,255,77,0.1)', padding: '8px', borderRadius: '10px', margin: 0 }}>✅ {success}</p>}

                <button className="premium-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', borderRadius: '14px', border: 'none', color: '#fff', fontWeight: 700, marginTop: '4px' }}>
                  {loading ? 'Creando cuenta...' : 'Completar Registro'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '2px' }}>
                  <button type="button" onClick={() => { setError(''); setSuccess(''); setView('login'); }} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    ¿Ya tienes cuenta? <span style={{ color: '#3490dc', fontWeight: 600 }}>Inicia Sesión</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
