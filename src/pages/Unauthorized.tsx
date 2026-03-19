// src/pages/Unauthorized.tsx
// Página 403 – acceso denegado
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ROL_HOME, ROL_LABEL } from '../permissions';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const home = user ? ROL_HOME[user.rol] : '/dashboard';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', maxWidth: '440px' }}
      >
        {/* Icono animado */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{ fontSize: '5rem', marginBottom: '20px' }}
        >
          🔒
        </motion.div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
          Acceso Denegado
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
          No tienes los permisos necesarios para acceder a esta sección.
          {user && (
            <> Tu perfil actual es <strong style={{ color: 'var(--primary)' }}>{ROL_LABEL[user.rol]}</strong>.</>
          )}
        </p>

        <div style={{
          background: 'var(--danger-dim)', border: '1px solid var(--danger)',
          borderRadius: 'var(--radius)', padding: '14px 18px',
          fontSize: '0.84rem', color: 'var(--danger)', marginBottom: '28px',
          textAlign: 'left',
        }}>
          <strong>¿Por qué ves esto?</strong><br />
          Esta sección requiere un nivel de acceso superior al que tiene tu cuenta.
          Contacta al administrador del sistema si crees que deberías tener acceso.
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <button className="btn btn-primary" onClick={() => navigate(home)}>
            🏠 Ir al inicio
          </button>
        </div>
      </motion.div>
    </div>
  );
}
