import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function InstallAppPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);

  // Helper para detectar sistemas operativos
  const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isHarmony = () => {
    if (typeof window === 'undefined') return false;
    return /HuaweiBrowser|HUAWEI|HarmonyOS/i.test(navigator.userAgent);
  };

  const isDesktop = () => {
    if (typeof window === 'undefined') return false;
    return /Windows|Linux|Macintosh/i.test(navigator.userAgent) && !isIOS();
  };

  useEffect(() => {
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
        setShowPrompt(true);
      };

      const installSuccessHandler = () => {
        localStorage.setItem('ergo_pwa_installed', 'true');
        setShowPrompt(false);
        setShowAdvantages(false);
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
            position: 'fixed', bottom: '80px', left: '16px', right: '16px',
            background: 'var(--bg-modal)', border: '1px solid var(--primary)',
            borderRadius: '16px', padding: '16px 20px', zIndex: 9999,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: '12px',
            maxWidth: '460px', margin: '0 auto'
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
              🦷
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Instalar ErgoDentalVE</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>App rápida y fluida para Android, iOS, Harmony, Windows y Linux.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleInstall} style={{ flex: 1, height: '36px' }}>Instalar Ahora</button>
            <button className="btn btn-ghost btn-sm" onClick={handleDismiss} style={{ height: '36px' }}>Luego</button>
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
            style={{ maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📱 ErgoDentalVE Multi-Plataforma</h3>
              <button className="btn-close" onClick={handleDismiss}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { icon: '🚀', title: 'Máxima Fluidez y Velocidad', desc: 'Funciona como aplicación nativa en Android, iOS, HarmonyOS, Windows y Linux.' },
                { icon: '📐', title: 'Pantalla Completa Sin Scroll Molesto', desc: 'Diseño ultra-adaptable a cualquier tamaño de pantalla, sin scroll horizontal.' },
                { icon: '📱', title: 'Acceso Directo al Instante', desc: 'Icono en tu pantalla de inicio o escritorio para iniciar en 1 toque.' },
                { icon: '🛡️', title: 'Seguridad y Sincronización', desc: 'Datos clínicos y finanzas respaldados en la nube en tiempo real.' }
              ].map(adv => (
                <div key={adv.title} style={{ display:'flex', gap:'16px', alignItems:'flex-start' }}>
                  <div style={{ 
                    width: '42px', height: '42px', borderRadius: '12px', 
                    background: 'var(--primary-dim)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                    flexShrink: 0
                  }}>
                    {adv.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize:'0.92rem', marginBottom: '2px' }}>{adv.title}</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight: 1.4 }}>{adv.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', padding: '16px 24px' }}>
              {deferredPrompt ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Tu dispositivo es compatible con instalación inmediata en 1 clic.</p>
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
                    style={{ width:'100%', fontSize: '1rem', padding: '12px' }}
                  >
                    🚀 Instalar Ahora
                  </button>
                  <button className="btn btn-ghost" onClick={handleDismiss} style={{ width:'100%', marginTop:'8px' }}>Cerrar</button>
                </div>
              ) : isIOS() ? (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '14px', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🍎 iOS / iPadOS</div>
                  <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '6px' }}>Instalación en Safari:</strong>
                  Toca el botón <strong style={{ color: 'var(--primary)' }}>Compartir</strong> (icono de cuadrado con flecha ↑) y selecciona <strong style={{ color: 'var(--primary)' }}>"Agregar a Inicio"</strong> ➕.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'14px' }}>Entendido</button>
                </div>
              ) : isHarmony() ? (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '14px', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🔴 Huawei / HarmonyOS</div>
                  <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '6px' }}>Instalación en Navegador Huawei / Petal:</strong>
                  Toca los 4 puntos o menú (⋮) en la esquina inferior y selecciona <strong style={{ color: 'var(--primary)' }}>"Añadir a pantalla de inicio"</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'14px' }}>Entendido</button>
                </div>
              ) : isDesktop() ? (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '14px', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>💻 Windows / Linux / Mac</div>
                  <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '6px' }}>Instalación de Escritorio:</strong>
                  Haz clic en el icono de instalación <strong>(🖥️ o ⊕)</strong> en la barra de direcciones de tu navegador (Chrome/Edge/Brave) o en menú ⋮ &gt; <strong style={{ color: 'var(--primary)' }}>"Instalar ErgoDental"</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'14px' }}>Entendido</button>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'var(--primary-dim)', borderRadius: '14px', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🤖 Android</div>
                  <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '6px' }}>Instalación en Android:</strong>
                  Abre el menú (⋮) de tu navegador y selecciona <strong style={{ color: 'var(--primary)' }}>"Instalar aplicación"</strong> o <strong style={{ color: 'var(--primary)' }}>"Añadir a pantalla de inicio"</strong>.
                  <button className="btn btn-primary" onClick={handleDismiss} style={{ width:'100%', marginTop:'14px' }}>Entendido</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
