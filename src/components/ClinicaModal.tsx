// src/components/ClinicaModal.tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';

export default function ClinicaModal() {
  const { necesitaSeleccion, clinicas, setClinica, finalizarSeleccion } = useClinica();

  useEffect(() => {
    if (necesitaSeleccion) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [necesitaSeleccion]);

  if (!necesitaSeleccion) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ zIndex: 10000, background: 'rgba(5, 8, 20, 0.96)' }} // Mantener fondo más oscuro para selección inicial
        onClick={e => {
          if (localStorage.getItem('ergo_clinica_activa') && e.target === e.currentTarget) {
            finalizarSeleccion();
          }
        }}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.9, opacity: 0, y: 30 }}
          style={{ maxWidth: '480px', textAlign: 'center' }}
        >
          <div className="modal-body" style={{ padding: '48px 40px' }}>
            <div style={{ marginBottom: '40px' }}>
              <motion.div 
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                style={{
                  width: 90, height: 90, borderRadius: 24, margin: '0 auto 24px',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.8rem', boxShadow: '0 20px 50px rgba(0,198,255,0.4)',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                🏢
              </motion.div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-1.5px', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'lowercase' }}>
                ergodental
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600, margin: '0 auto' }}>
                Seleccione su Clínica
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              {clinicas.map(c => (
                <motion.button
                  key={c.id}
                  whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)', borderColor: 'var(--primary)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setClinica(c);
                    finalizarSeleccion();
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '18px',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#fff',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'rgba(0,198,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem'
                  }}>🦷</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1px' }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Sede {c.nombreCorto}</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <p style={{ marginTop: '32px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Podrá cambiar de sede en cualquier momento desde el menú lateral.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
