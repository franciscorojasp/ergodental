// src/components/CurrencyToggle.tsx
// Widget compacto: muestra tasa BCV del día + botón toggle USD/BS
// + enlace rápido para actualizar la tasa
import { useState } from 'react';
import { useMoneda } from '../contexts/MonedaContext';

export default function CurrencyToggle() {
  const { moneda, setMoneda, tasaBCV, necesitaTasa, guardarTasaManual } = useMoneda();
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState('');

  const handleActualizar = () => {
    const num = parseFloat(valor.replace(',', '.'));
    if (num > 10) {
      guardarTasaManual(num);
      setEditando(false);
      setValor('');
    }
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:'5px',
      padding:'10px 12px', margin:'8px 0',
      background:'rgba(30,90,180,0.08)',
      border:'1px solid rgba(30,90,180,0.18)',
      borderRadius:'10px',
    }}>
      {/* Tasa BCV */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>
          Tasa BCV
        </span>
        <button
          onClick={()=>setEditando(!editando)}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.74rem', color:'var(--primary)', padding:'0' }}
          title="Actualizar tasa manualmente"
        >
          ✏️
        </button>
      </div>

      {/* Valor actual */}
      {!editando && (
        <div style={{ fontWeight:800, fontSize:'0.88rem', color: necesitaTasa ? 'var(--warning)' : 'var(--primary)', letterSpacing:'-0.3px' }}>
          {necesitaTasa
            ? '⚠️ Sin tasa hoy'
            : `Bs ${tasaBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / $1`
          }
        </div>
      )}

      {/* Edición inline */}
      {editando && (
        <div style={{ display:'flex', gap:'4px', marginTop:'2px' }}>
          <input
            autoFocus
            type="number"
            step="0.01"
            min="10"
            placeholder="Ej: 65890"
            value={valor}
            onChange={e=>setValor(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') handleActualizar(); if(e.key==='Escape') setEditando(false); }}
            style={{
              flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(0,198,255,0.4)',
              borderRadius:'6px', color:'var(--text-primary)', padding:'4px 8px', fontSize:'0.82rem',
              outline:'none', minWidth:0,
            }}
          />
          <button onClick={handleActualizar} style={{
            background:'var(--primary)', border:'none', borderRadius:'6px', color:'#fff',
            padding:'4px 8px', cursor:'pointer', fontSize:'0.8rem', fontWeight:700,
          }}>✓</button>
          <button onClick={()=>setEditando(false)} style={{
            background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'6px', color:'var(--text-muted)',
            padding:'4px 6px', cursor:'pointer', fontSize:'0.8rem',
          }}>✕</button>
        </div>
      )}

      {/* Toggle USD / BS */}
      <div style={{
        display:'flex', background:'rgba(0,0,0,0.15)', borderRadius:'7px', padding:'2px', marginTop:'4px',
      }}>
        {(['USD','BS'] as const).map(m => (
          <button key={m} onClick={() => setMoneda(m)} style={{
            flex:1, padding:'4px 0', border:'none', cursor:'pointer', borderRadius:'5px',
            fontSize:'0.78rem', fontWeight:700, transition:'all 0.2s',
            background: moneda === m ? 'var(--primary)' : 'transparent',
            color: moneda === m ? '#fff' : 'var(--text-muted)',
          }}>
            {m === 'USD' ? '💲 USD' : '🇻🇪 Bs'}
          </button>
        ))}
      </div>
    </div>
  );
}
