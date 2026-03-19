// src/components/ClinicaModal.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';

export default function ClinicaModal() {
  const { necesitaSeleccion, clinicas, setClinica, finalizarSeleccion } = useClinica();

  if (!necesitaSeleccion) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(5, 8, 20, 0.95)',
          backdropFilter: 'blur(25px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
        onClick={e => {
          // Si ya hay una clínica en storage, permitimos cerrar al hacer clic afuera
          if (localStorage.getItem('ergo_clinica_activa') && e.target === e.currentTarget) {
            finalizarSeleccion();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.9, opacity: 0, y: 20 }}
          style={{
            background: 'linear-gradient(160deg, rgba(20,30,60,0.98) 0%, rgba(10,15,35,0.98) 100%)',
            border: '1px solid rgba(0,198,255,0.3)',
            borderRadius: '24px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            padding: '40px',
            width: '100%',
            maxWidth: '540px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '40px' }}>
            <motion.div 
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              style={{
                width: 90, height: 90, borderRadius: 24, margin: '0 auto 24px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.8rem', boxShadow: '0 20px 50px rgba(0,198,255,0.5)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              🏢
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent)', transform:'translateX(-100%)', animation:'shimmer 3s infinite' }} />
            </motion.div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'lowercase' }}>
              ergodental
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600, maxWidth: '400px', margin: '0 auto' }}>
              Selecciona la Clínica...
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {clinicas.map(c => (
              <motion.button
                key={c.id}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setClinica(c);
                  finalizarSeleccion();
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  color: '#fff',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(0,198,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>🦷</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: '2px' }}>{c.nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Sede {c.nombreCorto}</div>
                </div>
              </motion.button>
            ))}
          </div>

          <p style={{ marginTop: '30px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Podrás cambiar de sede en cualquier momento desde el menú lateral.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
