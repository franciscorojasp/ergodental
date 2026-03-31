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
        whileHover={esAutorizado ? { background: 'rgba(255,255,255,0.06)', borderColor: 'var(--primary)' } : {}}
        whileTap={esAutorizado ? { scale: 0.98 } : {}}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          cursor: esAutorizado ? 'pointer' : 'default',
          width: '100%',
          textAlign: 'left',
          color: 'var(--text-primary)',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem',
          boxShadow: '0 4px 12px var(--primary-glow)',
          flexShrink: 0
        }}>🏢</div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '1.5px', marginBottom: '2px' }}>
            Sede Activa
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
            {clinica.nombreCorto}
          </div>
        </div>

        {esAutorizado && (
          <motion.div 
            animate={{ rotate: open ? 180 : 0 }}
            style={{ fontSize: '0.7rem', opacity: 0.5, color: 'var(--primary)' }}
          >
            ▼
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{    opacity: 0, y: 8, scale: 0.96 }}
            className="glass"
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              padding: '8px', zIndex: 1000,
              background: 'var(--bg-modal)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ padding: '8px 12px 4px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Seleccionar Clínica
            </div>
            {clinicas.map(c => (
              <button
                key={c.id}
                onClick={() => { cambiarClinica(c.id); setOpen(false); }}
                style={{
                  width: '100%', padding: '12px',
                  textAlign: 'left', background: clinica.id === c.id ? 'var(--primary-dim)' : 'transparent',
                  border: 'none', borderRadius: '10px',
                  color: clinica.id === c.id ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: '0.2s'
                }}
              >
                <div style={{ 
                  width: 6, height: 6, borderRadius: '50%', 
                  background: clinica.id === c.id ? 'var(--primary)' : 'transparent',
                  boxShadow: clinica.id === c.id ? '0 0 8px var(--primary)' : 'none'
                }} />
                {c.nombreCorto}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
