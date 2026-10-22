// src/pages/ResetPassword.tsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ResetPassword() {
  const navigate = useNavigate();

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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 90, height: 90, borderRadius: 26, background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '60%', height: '60%', filter: 'drop-shadow(0 0 10px rgba(52, 144, 220, 0.5))' }} />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', letterSpacing: '-1.2px', marginBottom: '4px' }}>ACCESO Y CREDENCIALES</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>GESTIÓN DE CUENTAS CLÍNICAS</p>
        </div>

        <div className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)',
          borderRadius: '32px', padding: '36px 32px', border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '2.5rem' }}>🪪</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Restablecimiento Clínico Oficial
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              Las contraseñas y accesos son gestionados y auditados de forma directa por la <strong>Administración</strong> a través de <strong>Gestión de Cuentas</strong>, mediante emisión de credenciales seguras y códigos QR personalizados.
            </p>

            <div style={{
              padding: '14px',
              borderRadius: '16px',
              background: 'rgba(0, 198, 255, 0.08)',
              border: '1px solid rgba(0, 198, 255, 0.25)',
              fontSize: '0.82rem',
              color: '#fff',
              lineHeight: 1.4,
              textAlign: 'left'
            }}>
              📲 <strong>¿Cómo ingresar al sistema?</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: 'rgba(255,255,255,0.8)' }}>
                <li>Solicita a Administración tu clave temporal o código QR.</li>
                <li>Escanea tu código QR desde tu teléfono para entrar al instante.</li>
                <li>O ingresa en la pantalla de inicio con la clave asignada.</li>
              </ul>
            </div>

            <button 
              type="button" 
              className="premium-btn"
              onClick={() => navigate('/login')}
              style={{ 
                width: '100%', padding: '15px', background: 'linear-gradient(135deg, #3490dc 0%, #663399 100%)', 
                borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.92rem', marginTop: '4px' 
              }}
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
