// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { IS_DEMO_MODE } from '../api';
import { ROL_HOME } from '../permissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      navigate(ROL_HOME[loggedUser.rol], { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 16px',
              boxShadow: '0 12px 40px rgba(0,198,255,0.35)',
            }}
          >🦷</motion.div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Ergodental</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem' }}>Sistema de Gestión Clínica</p>
        </div>

        {/* Tarjeta */}
        <div className="glass" style={{ padding: '32px' }}>
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
              <label>Contraseña</label>
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
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © 2026 Ergodental · Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  );
}
