import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function InstallAppPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);

  const [showLauncher, setShowLauncher] = useState(false);

  // Helper para detectar si estamos en iOS
  const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  useEffect(() => {
    if (!user) return;

    const checkInstallation = async () => {
      // 1. Detectar si ya está en la app nativa 
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        return; // Está dentro de la app, perfecto.
      }

      // Si no está en la app, verificar si la tiene instalada para mostrarle el botón de ABRIR (Launcher)
      let isInstalled = false;

      // Chrome Native API
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            isInstalled = true;
          }
        } catch (e) { /* ignore */ }
      }

      if (localStorage.getItem('ergo_pwa_installed') === 'true') {
        isInstalled = true;
      }

      if (isInstalled) {
        setShowLauncher(true);
        return; // Abortamos el resto porque YA está instalada
      }

      // -- Flujo normal para usuarios que NO la tienen instalada --
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (dismissed) return;

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true); 
      };

      const installSuccessHandler = () => {
        localStorage.setItem('ergo_pwa_installed', 'true');
        setShowPrompt(false);
        setShowAdvantages(false);
        setShowLauncher(true); // Una vez instalada, le ofrecemos abrirla
      };

      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', installSuccessHandler);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installSuccessHandler);
      };
    };

    const cleanupPromise = checkInstallation();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [user]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        localStorage.setItem('ergo_pwa_installed', 'true');
        setShowLauncher(true);
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

  const handleLaunchApp = () => {
    // Intenta abrir el protocolo personalizado web+ergodental registrado en manifest
    window.location.href = 'web+ergodental://launch';
    
    // Le indicamos visualmente que puede cerrar
    alert("Abriendo Ergodental Desktop...\n\nPor políticas de seguridad, el navegador no permite cerrarse automáticamente. ¡Puedes cerrar esta pestaña de forma manual y segura!");
  };

  if (!showPrompt && !showAdvantages && !showLauncher) return null;

  return (
    <AnimatePresence>
      {showLauncher && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-modal)', border: '1px solid var(--primary)',
            borderRadius: '20px', padding: '12px 20px', zIndex: 9999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '15px',
            width: '90%', maxWidth: '400px', cursor: 'pointer'
          }}
          onClick={handleLaunchApp}
        >
          <div style={{ fontSize: '24px' }}>🚀</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Abrir en ErgoDental</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cambiar a la aplicación oficial</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '5px' }} onClick={(e) => { e.stopPropagation(); setShowLauncher(false); }}>✕</button>
        </motion.div>
      )}

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
              <button className="btn-close" onClick={handleDismiss}>✕</button>
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
            <div className="modal-footer" style={{ flexDirection: 'column' }}>
              {deferredPrompt ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Tu dispositivo <strong>Android / PC</strong> es compatible con instalación rápida.</p>
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
                    style={{ width:'100%', fontSize: '1.1rem', padding: '12px' }}
                  >
                    🚀 Instalar Automáticamente
                  </button>
                  <button className="btn btn-ghost" onClick={handleDismiss} style={{ width:'100%', marginTop:'8px' }}>Cerrar</button>
                </div>
              ) : isIOS() ? (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🍎</div>
                  <strong>Instalación manual requerida en iPhone/iPad:</strong><br/><br/>
                  Por restricciones de Apple, toca el ícono de "Compartir" en la barra de Safari y selecciona <strong>"Agregar a inicio" ➕</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'15px' }}>Entendido</button>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🤖 💻</div>
                  <strong>Instalación manual en Android o PC:</strong><br/><br/>
                  Abre el menú de opciones de tu navegador (los tres puntos verticales ⋮) y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla principal"</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'15px' }}>Entendido</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
