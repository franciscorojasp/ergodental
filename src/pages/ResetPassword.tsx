// src/pages/ResetPassword.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      await updatePassword(password);
      setSuccess('Contraseña actualizada con éxito. Redirigiendo...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña');
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
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-1.2px', marginBottom: '4px' }}>NUEVA CONTRASEÑA</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 500 }}>REESTABLECE TUS CREDENCIALES</p>
        </div>

        <div className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)',
          borderRadius: '32px', padding: '40px', border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div className="input-group">
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>NUEVA CONTRASEÑA</label>
              <input 
                className="premium-input" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px', color: '#fff' }} 
              />
            </div>

            <div className="input-group">
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>CONFIRMAR CONTRASEÑA</label>
              <input 
                className="premium-input" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px', color: '#fff' }} 
              />
            </div>

            {error && (
              <p style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '10px', borderRadius: '12px' }}>⚠️ {error}</p>
            )}

            {success && (
              <p style={{ color: '#4dff4d', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(77,255,77,0.1)', padding: '10px', borderRadius: '12px' }}>✅ {success}</p>
            )}

            <button className="premium-btn" type="submit" disabled={loading} style={{ 
              width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', 
              borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 700 
            }}>
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button type="button" onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Volver al inicio</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
