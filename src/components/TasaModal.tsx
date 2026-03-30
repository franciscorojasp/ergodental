// src/components/TasaModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';

export default function TasaModal() {
  const { necesitaTasa, guardarTasaManual, historialTasas, loading } = useMoneda();
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');

  const hoy       = new Date().toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const ultimaTasa = historialTasas.find(t => t.tasa > 0);

  useEffect(() => {
    if (necesitaTasa && !loading) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [necesitaTasa, loading]);

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

  if (loading || !necesitaTasa) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ zIndex: 10000, background: 'rgba(5, 8, 20, 0.94)' }}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ maxWidth: '480px', textAlign: 'center' }}
        >
          <div className="modal-body" style={{ padding: '40px' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', boxShadow: '0 10px 35px rgba(0,198,255,0.4)',
              }}>💱</div>
              
              <h2 style={{ fontWeight: 900, fontSize: '1.6rem', marginBottom: '8px', letterSpacing: '-0.5px', color: '#fff' }}>
                Tasa de Cambio Oficial
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '16px' }}>
                Ingrese la tasa BCV oficial del día para los cálculos en Bolívares.
              </p>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 16px', borderRadius: '24px',
                background: 'rgba(0,198,255,0.08)', border: '1px solid rgba(0,198,255,0.2)',
                fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'capitalize',
              }}>
                📅 {hoy}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1.5px' }}>
                Tasa BCV (Bs por 1 USD $)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 900, zIndex: 5
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
                  className="input"
                  style={{
                    paddingLeft: '54px', paddingRight: '54px',
                    fontSize: '1.8rem', fontWeight: 800, textAlign: 'center',
                    height: '68px', borderRadius: '18px',
                    borderColor: error ? 'var(--danger)' : 'var(--border-active)',
                    background: 'rgba(255,255,255,0.04)'
                  }}
                />
                <span style={{
                  position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600
                }}>/ $1</span>
              </div>
              {error && (
                <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                  style={{ color:'var(--danger)', fontSize:'0.85rem', marginTop:'10px', fontWeight: 600 }}>
                  ⚠️ {error}
                </motion.p>
              )}
            </div>

            {ultimaTasa && (
              <div style={{
                marginBottom: '28px',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                fontSize: '0.85rem', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>📋 Tasa {ultimaTasa.fecha}: <strong>Bs {ultimaTasa.tasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</strong></span>
                <button
                  onClick={() => setValor(String(ultimaTasa.tasa))}
                  className="btn-ghost"
                  style={{
                    padding: '4px 10px', fontSize: '0.75rem', height: 'auto', minHeight: 'auto', borderRadius: '8px'
                  }}
                >
                  Usar esta
                </button>
              </div>
            )}

            <button
              onClick={handleGuardar}
              disabled={!valor}
              className={`btn ${valor ? 'btn-primary' : 'btn-ghost'}`}
              style={{ width: '100%', height: '56px', fontSize: '1.05rem', opacity: valor ? 1 : 0.5 }}
            >
              ✓ Confirmar Tasa del Día
            </button>

            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>
              Esta tasa se aplicará a todas las transacciones de hoy.<br/>
              Actualizable en <strong>Finanzas → Tasa BCV</strong>.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
