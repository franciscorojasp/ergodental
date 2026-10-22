// src/components/CurrencyToggle.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoneda } from '../contexts/MonedaContext';

export default function CurrencyToggle({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { 
    moneda, 
    setMoneda, 
    tasaBCV, 
    tasaEuroBCV, 
    fechaTasaBCV,
    necesitaTasa, 
    guardarTasaManual,
    actualizarTasasAuto,
    actualizandoTasas
  } = useMoneda();

  const [editando, setEditando] = useState(false);
  const [valorDolar, setValorDolar] = useState('');
  const [valorEuro, setValorEuro]   = useState('');
  const isCompact = variant === 'compact';

  const handleIniciarEdicion = () => {
    setValorDolar(tasaBCV > 0 ? tasaBCV.toString() : '');
    setValorEuro(tasaEuroBCV > 0 ? tasaEuroBCV.toString() : '');
    setEditando(true);
  };

  const handleActualizar = async () => {
    const numDolar = parseFloat(valorDolar.replace(',', '.'));
    const numEuro  = parseFloat(valorEuro.replace(',', '.'));
    if (numDolar > 1) {
      await guardarTasaManual(numDolar, numEuro > 1 ? numEuro : undefined);
      setEditando(false);
    }
  };

  if (isCompact) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '6px', 
        padding: '3px 6px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0, minHeight: '36px'
      }}>
        <AnimatePresence mode="wait">
          {editando ? (
            <motion.div 
              key="edit-compact"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', gap: '3px', alignItems: 'center' }}
            >
              <input
                autoFocus
                type="number"
                step="0.01"
                placeholder="$ USD"
                value={valorDolar}
                onChange={e => setValorDolar(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') handleActualizar(); if(e.key === 'Escape') setEditando(false); }}
                style={{
                  width: '56px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)',
                  borderRadius: '6px', color: '#fff', padding: '2px 4px', fontSize: '0.68rem',
                  outline: 'none', fontWeight: 700
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="€ EUR"
                value={valorEuro}
                onChange={e => setValorEuro(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') handleActualizar(); if(e.key === 'Escape') setEditando(false); }}
                style={{
                  width: '56px', background: 'rgba(0,0,0,0.3)', border: '1px solid #10b981',
                  borderRadius: '6px', color: '#fff', padding: '2px 4px', fontSize: '0.68rem',
                  outline: 'none', fontWeight: 700
                }}
              />
              <button 
                onClick={handleActualizar} 
                style={{ 
                  background: 'var(--primary)', border: 'none', borderRadius: '6px', 
                  padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900 
                }}
              >✓</button>
            </motion.div>
          ) : (
            <motion.div 
              key="display-compact"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.68rem', fontWeight: 800,
                background: 'rgba(0, 212, 255, 0.08)', padding: '3px 6px', borderRadius: '8px',
                whiteSpace: 'nowrap'
              }}
              title={`Oficial BCV:\nUSD: Bs. ${tasaBCV || 'Sin tasa'}\nEUR: Bs. ${tasaEuroBCV || 'Sin tasa'}\nFecha: ${fechaTasaBCV || 'Hoy'}`}
            >
              <span 
                onClick={handleIniciarEdicion} 
                style={{ color: 'var(--primary)', cursor: 'pointer' }}
              >
                ${tasaBCV > 0 ? tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '---'}
              </span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span 
                onClick={handleIniciarEdicion} 
                style={{ color: '#10b981', cursor: 'pointer' }}
              >
                €{tasaEuroBCV > 0 ? tasaEuroBCV.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '---'}
              </span>
              <button
                onClick={() => actualizarTasasAuto(true)}
                disabled={actualizandoTasas}
                title="Sincronizar tasas BCV en vivo"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0 2px', display: 'flex', alignItems: 'center',
                  color: actualizandoTasas ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <motion.span
                  animate={{ rotate: actualizandoTasas ? 360 : 0 }}
                  transition={{ repeat: actualizandoTasas ? Infinity : 0, duration: 1, ease: 'linear' }}
                  style={{ display: 'inline-block', fontSize: '0.75rem' }}
                >
                  🔄
                </motion.span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dense Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
          {(['USD','BS'] as const).map(m => (
            <button key={m} onClick={() => setMoneda(m)} style={{
              padding: '3px 7px', border: 'none', cursor: 'pointer', borderRadius: '6px',
              fontSize: '0.65rem', fontWeight: 900,
              background: moneda === m ? 'var(--primary)' : 'transparent',
              color: moneda === m ? '#000' : 'var(--text-secondary)',
              transition: '0.2s',
              zIndex: 1
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
      padding:'12px 14px', margin:'10px 0',
      background:'rgba(0, 212, 255, 0.03)',
      border:'1px solid rgba(0, 212, 255, 0.12)',
      borderRadius:'18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
      {/* Tasa BCV Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize:'0.65rem', color:'var(--text-secondary)', fontWeight:900, textTransform:'uppercase', letterSpacing: '0.8px' }}>
            Tasas BCV Oficiales
          </span>
          <span style={{ 
            fontSize: '0.55rem', padding: '1px 5px', borderRadius: '6px', 
            background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800 
          }}>
            EN VIVO
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => actualizarTasasAuto(true)}
            disabled={actualizandoTasas}
            style={{ 
              background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', 
              color: actualizandoTasas ? 'var(--primary)' : 'var(--text-muted)', padding:'0' 
            }}
            title="Sincronizar tasas BCV en vivo"
          >
            <motion.span
              animate={{ rotate: actualizandoTasas ? 360 : 0 }}
              transition={{ repeat: actualizandoTasas ? Infinity : 0, duration: 1, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              🔄
            </motion.span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, color: 'var(--primary)' }}
            onClick={editando ? () => setEditando(false) : handleIniciarEdicion}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem', color:'var(--text-muted)', padding:'0' }}
            title="Editar manualmente"
          >
            {editando ? '✕' : '✎'}
          </motion.button>
        </div>
      </div>

      {/* Valores Display / Edit */}
      <AnimatePresence mode="wait">
        {!editando ? (
          <motion.div 
            key="display"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            {/* Dólar Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--primary)' }}>$</span> Dólar BCV:
              </span>
              <span style={{ 
                fontWeight: 900, fontSize: '0.88rem', 
                color: necesitaTasa ? 'var(--warning)' : 'var(--text-primary)',
                fontFamily: 'monospace'
              }}>
                {tasaBCV > 0 ? `Bs. ${tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sin tasa'}
              </span>
            </div>

            {/* Euro Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#10b981' }}>€</span> Euro BCV:
              </span>
              <span style={{ 
                fontWeight: 900, fontSize: '0.88rem', 
                color: tasaEuroBCV > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'monospace'
              }}>
                {tasaEuroBCV > 0 ? `Bs. ${tasaEuroBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sin tasa'}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="edit"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ display:'flex', flexDirection: 'column', gap:'6px' }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                autoFocus
                type="number"
                step="0.01"
                placeholder="USD (Bs.)"
                value={valorDolar}
                onChange={e=>setValorDolar(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleActualizar(); if(e.key==='Escape') setEditando(false); }}
                style={{
                  flex:1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)',
                  borderRadius:'8px', color: '#fff', padding: '5px 8px', fontSize: '0.8rem',
                  outline:'none', minWidth:0, fontWeight: 700
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="EUR (Bs.)"
                value={valorEuro}
                onChange={e=>setValorEuro(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleActualizar(); if(e.key==='Escape') setEditando(false); }}
                style={{
                  flex:1, background: 'rgba(0,0,0,0.3)', border: '1px solid #10b981',
                  borderRadius:'8px', color: '#fff', padding: '5px 8px', fontSize: '0.8rem',
                  outline:'none', minWidth:0, fontWeight: 700
                }}
              />
              <button onClick={handleActualizar} style={{
                background:'var(--primary)', border:'none', borderRadius:'8px', color:'#000',
                padding:'5px 10px', cursor:'pointer', fontSize:'0.85rem', fontWeight:900,
              }}>✓</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Toggle Switch */}
      <div style={{
        display:'flex', background:'rgba(0,0,0,0.4)', borderRadius:'12px', padding:'3px', marginTop:'2px'
      }}>
        {(['USD','BS'] as const).map(m => (
          <button key={m} onClick={() => setMoneda(m)} style={{
            flex:1, padding:'5px 0', border:'none', cursor:'pointer', borderRadius:'9px',
            fontSize:'0.72rem', fontWeight:800, transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
