// src/components/CurrencyToggle.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';

export default function CurrencyToggle({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { moneda, setMoneda, tasaBCV, necesitaTasa, guardarTasaManual } = useMoneda();
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState('');
  const isCompact = variant === 'compact';

  const handleActualizar = () => {
    const num = parseFloat(valor.replace(',', '.'));
    if (num > 10) {
      guardarTasaManual(num);
      setEditando(false);
      setValor('');
    }
  };

  if (isCompact) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '8px', 
        padding: '4px 6px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0
      }}>
        {/* Compact Tasa Pill */}
        <div style={{ 
          fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', 
          background: 'var(--primary-dim)', padding: '4px 8px', borderRadius: '8px',
          whiteSpace: 'nowrap'
        }}>
          ${tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 1 })}
        </div>

        {/* Dense Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
          {(['USD','BS'] as const).map(m => (
            <button key={m} onClick={() => setMoneda(m)} style={{
              padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '6px',
              fontSize: '0.65rem', fontWeight: 900,
              background: moneda === m ? 'var(--primary)' : 'transparent',
              color: moneda === m ? '#000' : 'var(--text-secondary)',
              transition: '0.2s'
            }}>
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass" style={{
      display:'flex', flexDirection:'column', gap:'8px',
      padding:'14px', margin:'12px 0',
      background:'rgba(0, 212, 255, 0.03)',
      border:'1px solid rgba(0, 212, 255, 0.1)',
      borderRadius:'18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
      {/* Tasa BCV Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.65rem', color:'var(--text-secondary)', fontWeight:900, textTransform:'uppercase', letterSpacing: '1px' }}>
          Tasa BCV Ofic.
        </span>
        <motion.button
          whileHover={{ scale: 1.1, color: 'var(--primary)' }}
          onClick={()=>setEditando(!editando)}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem', color:'var(--text-muted)', padding:'0' }}
          title="Actualizar tasa"
        >
          {editando ? '✕' : '✎'}
        </motion.button>
      </div>

      {/* Valor Display */}
      <AnimatePresence mode="wait">
        {!editando ? (
          <motion.div 
            key="display"
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
            style={{ 
              fontWeight: 900, fontSize: '1.1rem', 
              color: necesitaTasa ? 'var(--warning)' : 'var(--text-primary)', 
              letterSpacing: '-0.5px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Bs.</span>
            {necesitaTasa ? 'Sin Tasa' : tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            {!necesitaTasa && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>/ $1</span>}
          </motion.div>
        ) : (
          <motion.div 
            key="edit"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ display:'flex', gap:'6px' }}
          >
            <input
              autoFocus
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valor}
              onChange={e=>setValor(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') handleActualizar(); if(e.key==='Escape') setEditando(false); }}
              style={{
                flex:1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)',
                borderRadius:'10px', color: '#fff', padding: '6px 10px', fontSize: '0.9rem',
                outline:'none', minWidth:0, fontWeight: 700
              }}
            />
            <button onClick={handleActualizar} style={{
              background:'var(--primary)', border:'none', borderRadius:'10px', color:'#000',
              padding:'6px 10px', cursor:'pointer', fontSize:'0.9rem', fontWeight:900,
            }}>✓</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Toggle Switch */}
      <div style={{
        display:'flex', background:'rgba(0,0,0,0.4)', borderRadius:'12px', padding:'3px', marginTop:'4px'
      }}>
        {(['USD','BS'] as const).map(m => (
          <button key={m} onClick={() => setMoneda(m)} style={{
            flex:1, padding:'6px 0', border:'none', cursor:'pointer', borderRadius:'10px',
            fontSize:'0.75rem', fontWeight:800, transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: moneda === m ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
            color: moneda === m ? '#000' : 'var(--text-secondary)',
            boxShadow: moneda === m ? '0 4px 10px rgba(0,0,0,0.3)' : 'none',
            letterSpacing: '0.5px'
          }}>
            {m === 'USD' ? '💲 USD' : '🇻🇪 VES'}
          </button>
        ))}
      </div>
    </div>
  );
}
