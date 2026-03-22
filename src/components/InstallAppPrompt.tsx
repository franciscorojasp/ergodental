import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar solo si no se ha descartado antes en esta sesión
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
         setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowAdvantages(true);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt && !showAdvantages) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          style={{
            position: 'fixed', bottom: '20px', left: '20px', right: '20px',
            background: 'var(--bg-modal)', border: '1px solid var(--primary)',
            borderRadius: '16px', padding: '20px', zIndex: 9999,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: '15px'
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🦷
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Instala ErgoDental</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Accede más rápido y recibe notificaciones en tiempo real.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleInstall} style={{ flex: 1 }}>Instalar Ahora</button>
            <button className="btn btn-ghost" onClick={handleDismiss}>Luego</button>
          </div>
        </motion.div>
      )}

      {showAdvantages && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="modal-overlay"
          style={{ zIndex: 10000 }}
        >
          <motion.div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>¿Por qué instalar la App?</h3>
              <button className="btn-close" onClick={() => setShowAdvantages(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: '15px' }}>
              {[
                { icon: '🚀', title: 'Mayor Velocidad', desc: 'La aplicación carga instantáneamente sin esperar al navegador.' },
                { icon: '🔔', title: 'Recordatorios', desc: 'Recibe alertas de citas y pagos directamente en tu pantalla.' },
                { icon: '📱', title: 'Acceso Directo', desc: 'Un icono elegante en tu pantalla de inicio como cualquier App nativa.' },
                { icon: '🌐', title: 'Modo Offline', desc: 'Consulta información básica incluso sin conexión a internet.' }
              ].map(adv => (
                <div key={adv.title} style={{ display:'flex', gap:'15px', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'1.5rem' }}>{adv.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize:'0.95rem' }}>{adv.title}</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>{adv.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { setShowAdvantages(false); setShowPrompt(true); }} style={{ width:'100%' }}>Entendido, mostrar instalador</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
