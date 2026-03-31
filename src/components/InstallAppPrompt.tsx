import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function InstallAppPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);

  // Helper para detectar si estamos en iOS
  const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  useEffect(() => {
    // Solo mostrar las recomendaciones si el usuario ya inició sesión
    if (!user) return;

    const checkInstallation = async () => {
      // 1. Detectar si ya está instalada empíricamente (PWA Standalone o Safari Home)
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        return; 
      }

      // 2. Detectar instalación activa usando Chrome Native API para PWAs (Si está en manifest.json)
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            localStorage.setItem('ergo_pwa_installed', 'true');
            return;
          }
        } catch (e) { /* ignore */ }
      }

      // 3. Marca orgánica interna 
      if (localStorage.getItem('ergo_pwa_installed') === 'true') return;

      // 4. Marca de rechazo del usuario
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (dismissed) return;

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true); // Solo mostrar el prompt "Instalar Ahora" si Chrome nos invita activamente a hacerlo
      };

      const installSuccessHandler = () => {
        localStorage.setItem('ergo_pwa_installed', 'true');
        setShowPrompt(false);
        setShowAdvantages(false);
      };

      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', installSuccessHandler);

      // Limpieza
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installSuccessHandler);
      };
    };

    const cleanupPromise = checkInstallation();
    
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        localStorage.setItem('ergo_pwa_installed', 'true');
      }
    } else {
      setShowPrompt(false); 
      setShowAdvantages(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowAdvantages(false);
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
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Instala ErgoDentalve</div>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={handleDismiss}
        >
          <motion.div 
            className="modal" 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{ maxWidth: '440px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📱 Ventajas de la App</h3>
              <button className="btn-close" onClick={handleDismiss}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { icon: '🚀', title: 'Mayor Velocidad', desc: 'La aplicación carga instantáneamente sin esperar al navegador.' },
                { icon: '🔔', title: 'Recordatorios', desc: 'Recibe alertas de citas y pagos directamente en tu pantalla.' },
                { icon: '📱', title: 'Acceso Directo', desc: 'Un icono elegante en tu pantalla de inicio como cualquier App nativa.' },
                { icon: '🌐', title: 'Modo Offline', desc: 'Consulta información básica incluso sin conexión a internet.' }
              ].map(adv => (
                <div key={adv.title} style={{ display:'flex', gap:'20px', alignItems:'flex-start' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px', 
                    background: 'var(--primary-dim)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    {adv.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize:'1rem', marginBottom: '4px' }}>{adv.title}</div>
                    <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight: 1.5 }}>{adv.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', padding: '24px 32px' }}>
              {deferredPrompt ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Tu dispositivo <strong>Android / PC</strong> es compatible con instalación rápida.</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                        setShowAdvantages(false);
                      }
                    }} 
                    style={{ width:'100%', fontSize: '1.1rem', padding: '14px' }}
                  >
                    🚀 Instalar Ahora
                  </button>
                  <button className="btn btn-ghost" onClick={handleDismiss} style={{ width:'100%', marginTop:'12px' }}>Cerrar</button>
                </div>
              ) : isIOS() ? (
                <div style={{ padding: '20px', background: 'var(--primary-dim)', borderRadius: '16px', fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>🍎</div>
                  <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '8px' }}>Instalación manual requerida:</strong>
                  En iPhone/iPad toca el ícono de <strong style={{ color: 'var(--primary)' }}>Compartir</strong> (cuadrado con flecha ↑) y luego <strong style={{ color: 'var(--primary)' }}>"Agregar al inicio"</strong> ➕.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'20px' }}>Entendido</button>
                </div>
              ) : (
                <div style={{ padding: '20px', background: 'var(--primary-dim)', borderRadius: '16px', fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>🤖 💻</div>
                  <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '8px' }}>Instalación manual requerida:</strong>
                  Abre el menú de opciones (⋮) y selecciona <strong style={{ color: 'var(--primary)' }}>"Instalar aplicación"</strong> o <strong style={{ color: 'var(--primary)' }}>"Añadir a pantalla principal"</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'20px' }}>Entendido</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
