import { useEffect, useState } from 'react';
import { getSyncQueueCount, IS_DEMO_MODE } from '../api';
import { motion } from 'framer-motion';

export default function SyncIndicator({ isPinned }: { isPinned: boolean }) {
  const [count, setCount] = useState(getSyncQueueCount());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateState = () => {
      setCount(getSyncQueueCount());
      setOnline(navigator.onLine);
    };

    const interval = setInterval(updateState, 3000);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('ergo_sync_completed', updateState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ergo_sync_completed', updateState);
    };
  }, []);

  if (!isPinned) {
    return (
      <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}>
        <div 
          style={{ 
            width:10, height:10, borderRadius:'50%', 
            background: IS_DEMO_MODE ? '#ff9800' : (online ? '#4caf50' : '#f44336'),
            boxShadow: online ? '0 0 10px rgba(76,175,80,0.3)' : 'none',
            transition: 'all 0.3s ease'
          }} 
          title={IS_DEMO_MODE ? 'Modo Local' : (online ? 'Sistema en Línea' : 'Sin Internet')}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: isPinned ? '12px' : '8px 0', marginBottom: '12px' }}>
      <div style={{ 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: isPinned ? '16px' : '10px', 
        padding: isPinned ? '12px 14px' : '10px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: isPinned ? 'flex-start' : 'center',
        boxShadow: online ? '0 4px 15px rgba(0,0,0,0.1)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            className={online ? 'pulse-dot' : ''}
            style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: IS_DEMO_MODE ? '#ff9800' : (online ? 'var(--success)' : 'var(--danger)'),
              boxShadow: online ? '0 0 12px var(--success)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} 
          />
          {isPinned && (
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontWeight: 900, 
              fontSize: '0.65rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1.2px',
              opacity: online ? 1 : 0.6
            }}>
              {IS_DEMO_MODE ? 'Local Mode' : (online ? 'Live System' : 'System Offline')}
            </span>
          )}
        </div>
        
        {isPinned && count > 0 && online && !IS_DEMO_MODE && (
          <motion.div 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              fontSize: '0.6rem', 
              color: 'var(--primary)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              background: 'var(--primary-dim)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 198, 255, 0.2)'
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>🔄</span>
            Sincronizando...
          </motion.div>
        )}
      </div>
    </div>
  );
}
