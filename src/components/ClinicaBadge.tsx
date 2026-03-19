// src/components/ClinicaBadge.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useAuth } from '../contexts/AuthContext';

export default function ClinicaBadge() {
  const { user } = useAuth();
  const { clinica, clinicas, cambiarClinica } = useClinica();
  const [open, setOpen] = useState(false);

  const esAutorizado = user?.rol === 'ADMIN' || user?.rol === 'DOCTOR' || user?.permisosMultiClinica === true;

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={() => esAutorizado && setOpen(!open)}
        whileHover={esAutorizado ? { background: 'rgba(255,255,255,0.1)' } : {}}
        whileTap={esAutorizado ? { scale: 0.97 } : {}}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px',
          background: 'rgba(25) 255, 255, 0.1)', // Slightly more visible
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          cursor: esAutorizado ? 'pointer' : 'default',
          width: '100%',
          textAlign: 'left',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem',
          boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.3)',
        }}>🏢</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>Sede Activa</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--primary)' }}>{clinica.nombreCorto}</div>
        </div>
        {esAutorizado && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{open ? '▲' : '▼'}</div>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{    opacity: 0, y: 10, scale: 0.95 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px', padding: '6px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)',
              zIndex: 100,
            }}
          >
            {clinicas.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  cambiarClinica(c.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%', padding: '10px 12px',
                  textAlign: 'left', background: 'none', border: 'none',
                  borderRadius: '8px', color: clinica.id === c.id ? 'var(--primary)' : '#fff',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
              >
                <span style={{ opacity: clinica.id === c.id ? 1 : 0 }}>●</span>
                {c.nombreCorto}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
