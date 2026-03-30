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
    <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
      <div style={{ 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: '12px', 
        padding: '10px',
        border: '1px solid var(--border)',
        fontSize: '0.7rem'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
           <div style={{ 
             width:8, height:8, borderRadius:'50%', 
             background: IS_DEMO_MODE ? '#ff9800' : (online ? '#4caf50' : '#f44336'),
             boxShadow: online ? '0 0 8px rgba(76,175,80,0.4)' : 'none'
           }} />
           <span style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em' }}>
             {IS_DEMO_MODE ? 'MODO LOCAL' : (online ? 'SISTEMA EN LÍNEA' : 'MODO OFFLINE')}
           </span>
        </div>
        
        {count > 0 && online && !IS_DEMO_MODE && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              marginTop: '6px', 
              fontSize: '0.65rem', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span className="pulse-dot" style={{ width:4, height:4, background:'var(--primary)', borderRadius:'50%' }} />
            Actualizando datos...
          </motion.div>
        )}
      </div>
    </div>
  );
}
