import { useEffect, useState } from 'react';
import { getSyncQueueCount, forceSync, IS_DEMO_MODE } from '../api';
import { motion } from 'framer-motion';

export default function SyncIndicator({ isPinned }: { isPinned: boolean }) {
  const [count, setCount] = useState(getSyncQueueCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(getSyncQueueCount());
      setOnline(navigator.onLine);
    }, 3000);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!online || IS_DEMO_MODE) return;
    setIsSyncing(true);
    try {
      await forceSync();
      setCount(getSyncQueueCount());
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isPinned) {
    return (
      <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}>
        <div 
          style={{ 
            width:10, height:10, borderRadius:'50%', 
            background: IS_DEMO_MODE ? '#ff9800' : (online ? (count > 0 ? '#ffeb3b' : '#4caf50') : '#f44336'),
            boxShadow: '0 0 8px rgba(0,0,0,0.5)'
          }} 
          title={IS_DEMO_MODE ? 'Modo Local' : (online ? `${count} pendientes` : 'Sin Internet')}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 12px', marginBottom: '12px' }}>
      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '12px', 
        padding: '10px',
        border: '1px solid var(--border)',
        fontSize: '0.75rem'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: '6px' }}>
           <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Estado del Sistema</span>
           <div style={{ 
             width:8, height:8, borderRadius:'50%', 
             background: IS_DEMO_MODE ? '#ff9800' : (online ? '#4caf50' : '#f44336') 
           }} />
        </div>

        <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '8px' }}>
          {IS_DEMO_MODE ? '🔌 MODO LOCAL (DEMO)' : (online ? '🌐 CONECTADO A LA NUBE' : '🚫 SIN CONEXIÓN')}
        </div>

        {count > 0 && !IS_DEMO_MODE && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ 
              background: 'rgba(255,152,0,0.1)', 
              border: '1px solid rgba(255,152,0,0.3)', 
              borderRadius: '8px',
              padding: '8px',
              marginTop: '4px'
            }}
          >
            <div style={{ color: '#ff9800', fontWeight: 700, marginBottom: '4px' }}>
              ⚠️ {count} cambios pendientes
            </div>
            <button 
              onClick={handleManualSync}
              disabled={isSyncing || !online}
              style={{
                width: '100%',
                padding: '4px',
                borderRadius: '4px',
                background: '#ff9800',
                color: '#fff',
                border: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isSyncing || !online ? 0.5 : 1
              }}
            >
              {isSyncing ? 'Sincronizando...' : 'SINCRONIZAR AHORA'}
            </button>
          </motion.div>
        )}

        {IS_DEMO_MODE && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontStyle: 'italic' }}>
            Los datos se guardan solo en este dispositivo.
          </div>
        )}
      </div>
    </div>
  );
}
