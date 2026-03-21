// src/components/TasaModal.tsx
// Modal diario para ingresar la tasa BCV oficial
// Se muestra cada vez que se abre la aplicación y no se ha ingresado la tasa del día.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';

export default function TasaModal() {
  const { necesitaTasa, tasaSetHoy, guardarTasaManual, historialTasas, tasaBCV } = useMoneda();
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [notificacionLeida, setNotificacionLeida] = useState(false);

  const hoy       = new Date().toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const ultimaTasa = historialTasas.find(t => t.tasa > 0);

  const handleGuardar = () => {
    const num = parseFloat(valor.replace(',', '.'));
    if (!num || num <= 0 || num < 10) {
      setError('Ingresa una tasa válida mayor a 10 Bs/$');
      return;
    }
    guardarTasaManual(num);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGuardar();
  };

  return (
    <AnimatePresence>
      {(necesitaTasa || (tasaSetHoy && !notificacionLeida)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(5, 8, 20, 0.92)',
            backdropFilter: 'blur(18px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            style={{
              background: 'linear-gradient(160deg, rgba(16,24,56,0.98) 0%, rgba(10,15,35,0.98) 100%)',
              border: `1px solid ${necesitaTasa ? 'rgba(0,198,255,0.25)' : 'rgba(0,255,163,0.25)'}`,
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,198,255,0.1) inset',
              padding: '36px 40px',
              width: '100%',
              maxWidth: '480px',
              textAlign: 'center',
            }}
          >
            {/* Logo + fecha */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
                background: necesitaTasa 
                  ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
                  : 'linear-gradient(135deg, #00ffa3, #00c6ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', boxShadow: '0 8px 30px rgba(0,198,255,0.3)',
              }}>{necesitaTasa ? '💱' : '✅'}</div>
              
              {necesitaTasa ? (
                <>
                  <h2 style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                    Tasa de Cambio Oficial
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    Por favor ingresa la tasa BCV oficial del día de hoy para poder calcular los montos en Bolívares.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: '6px', letterSpacing: '-0.5px', color: '#00ffa3' }}>
                    Tasa Ya Establecida
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    La tasa BCV para el día de hoy ya ha sido ingresada por otro usuario o sesión previa.
                  </p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '20px 0', color: '#fff' }}>
                    <span style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '8px', color: 'var(--text-muted)' }}>Bs</span>
                    {tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </>
              )}

              <div style={{
                display: 'inline-block', marginTop: '10px',
                padding: '4px 14px', borderRadius: '20px',
                background: 'rgba(0,198,255,0.1)', border: '1px solid rgba(0,198,255,0.2)',
                fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'capitalize',
              }}>
                📅 {hoy}
              </div>
            </div>

            {necesitaTasa ? (
              <>
                {/* Input de tasa */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    Tasa BCV (Bs por 1 USD $)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 800,
                    }}>Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="10"
                      autoFocus
                      placeholder={ultimaTasa ? ultimaTasa.tasa.toLocaleString('es-VE', {maximumFractionDigits:2}) : '0.00'}
                      value={valor}
                      onChange={e => { setValor(e.target.value); setError(''); }}
                      onKeyDown={handleKeyDown}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '14px 50px 14px 46px',
                        fontSize: '1.5rem', fontWeight: 700, textAlign: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        border: `2px solid ${error ? 'var(--danger)' : 'rgba(0,198,255,0.35)'}`,
                        borderRadius: '12px', color: 'var(--text-primary)',
                        outline: 'none', letterSpacing: '0.5px',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <span style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.85rem', color: 'var(--text-muted)',
                    }}>/ $1</span>
                  </div>
                  {error && (
                    <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                      style={{ color:'var(--danger)', fontSize:'0.8rem', marginTop:'6px' }}>
                      ⚠️ {error}
                    </motion.p>
                  )}
                </div>

                {/* Referencia día anterior */}
                {ultimaTasa && (
                  <div style={{
                    margin: '10px 0 20px',
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                  }}>
                    📋 Tasa del {ultimaTasa.fecha}:{' '}
                    <strong style={{ color: 'var(--accent)' }}>
                      Bs {ultimaTasa.tasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                    </strong>
                    {' '}
                    <button
                      onClick={() => setValor(String(ultimaTasa.tasa))}
                      style={{
                        background: 'none', border: '1px solid rgba(0,198,255,0.3)',
                        color: 'var(--primary)', cursor: 'pointer', borderRadius: '6px',
                        padding: '2px 8px', fontSize: '0.75rem', marginLeft: '6px',
                      }}
                    >
                      Usar esta
                    </button>
                  </div>
                )}

                <button
                  onClick={handleGuardar}
                  disabled={!valor}
                  style={{
                    width: '100%', padding: '14px',
                    background: valor
                      ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                      : 'rgba(255,255,255,0.08)',
                    border: 'none', borderRadius: '12px',
                    color: valor ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800, fontSize: '1rem',
                    cursor: valor ? 'pointer' : 'not-allowed',
                    letterSpacing: '0.3px',
                    boxShadow: valor ? '0 8px 24px rgba(0,198,255,0.3)' : 'none',
                    transition: 'all 0.25s',
                  }}
                >
                  ✓ Confirmar Tasa del Día
                </button>
              </>
            ) : (
              <button
                onClick={() => setNotificacionLeida(true)}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #00ffa3, #00c6ff)',
                  border: 'none', borderRadius: '12px',
                  color: '#001a1a', fontWeight: 800, fontSize: '1rem',
                  cursor: 'pointer', letterSpacing: '0.3px',
                  boxShadow: '0 8px 24px rgba(0,255,163,0.3)',
                  transition: 'all 0.25s',
                }}
              >
                Entendido
              </button>
            )}

            <p style={{ marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Esta tasa se usará para todos los cálculos en Bolívares durante el día de hoy.<br/>
              {necesitaTasa ? (
                <span>Puedes actualizarla en cualquier momento desde <strong>Finanzas → Tasa BCV</strong>.</span>
              ) : (
                <span>Si necesitas ajustarla, contacta a un administrador.</span>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
