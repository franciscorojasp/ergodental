import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ContentProvider } from './ContentContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentProvider>
      <App />
    </ContentProvider>
  </StrictMode>,
)



// Limpieza profunda de Service Workers y Caches obsoletos (Estrategia PWA Primer Mundo)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('🗑️ Antiguo vigilante (SW) eliminado automáticamente.');
    }
  });
}
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) caches.delete(name);
  });
}
