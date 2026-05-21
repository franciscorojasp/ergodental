// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonedaProvider } from './contexts/MonedaContext';
import { ClinicaProvider } from './contexts/ClinicaContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import RoleGuard from './components/RoleGuard';
import TasaModal from './components/TasaModal';
import ClinicaModal from './components/ClinicaModal';
import HelpCenter from './components/HelpCenter';
import InstallAppPrompt from './components/InstallAppPrompt';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Citas from './pages/Citas';
import Personal from './pages/Personal';
import Odontograma from './pages/Odontograma';
import Inventario from './pages/Inventario';
import Finanzas from './pages/Finanzas';
import Proveedores from './pages/Proveedores';
import TasaBCV from './pages/TasaBCV';
import ConfiguracionClinica from './pages/ConfiguracionClinica';
import Agenda from './pages/Agenda';
import Presupuestos from './pages/Presupuestos';
import Recibos from './pages/Recibos';
import Laboratorios from './pages/Laboratorios';
import Usuarios from './pages/Usuarios';
import ResetPassword from './pages/ResetPassword';
import Desarrolladores from './pages/Desarrolladores';
import ManualTecnico from './pages/ManualTecnico';
import { ROL_HOME } from './permissions';

import { useState, useEffect } from 'react';
import { useContent } from './ContentContext';

function AppLoader({ subtitle }: { subtitle?: string }) {
  const { content } = useContent();
  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 99999, 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      background: 'var(--bg-dark)', color: 'var(--text-primary)'
    }}>
      <div className="animate-pulse-view" style={{
        width: 100, height: 100, borderRadius: 24, 
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        boxShadow: '0 20px 50px rgba(0,198,255,0.3)',
        overflow: 'hidden',
        padding: '2px' 
      }}>
        <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '22px' }} />
      </div>
      <h2 style={{ marginTop: '32px', fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase', background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ergodentalve</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px', letterSpacing: '0.5px', fontWeight: 600 }}>{subtitle || content.loading_app}</p>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [sidebarPinned, setSidebarPinned] = useState(() => 
    localStorage.getItem('ergo_sidebar_pinned') !== 'false'
  );

  const togglePinned = () => {
    const newVal = !sidebarPinned;
    setSidebarPinned(newVal);
    localStorage.setItem('ergo_sidebar_pinned', String(newVal));
  };

  // Cerrar sidebar automáticamente al cambiar a móvil si estaba abierto
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const { content } = useContent();

  if (loading) return <AppLoader subtitle={content.loading_session} />;
  if (!user) return <Navigate to="/login" replace />;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;
    
    // Si desliza hacia la derecha (>50px) y empezó en el primer cuarto de pantalla (<100px)
    if (distance > 70 && touchStart < 100) setSidebarOpen(true);
    setTouchStart(null);
  };

  return (
    <div className="app-layout animate-fade-in" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isPinned={sidebarPinned} 
        onTogglePinned={togglePinned}
      />
      
      {/* Modales globales */}
      <TasaModal />
      <HelpCenter />
      <InstallAppPrompt />


      {/* Mobile Overlay (Backdrop) */}
      <div 
        className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header - Siempre visible en móvil, o en desktop si el sidebar está cerrado */}
        <header className="mobile-header">
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ 
              background:'none', border:'none', color:'var(--text-primary)', 
              display:'flex', alignItems:'center', gap:'10px',
              fontSize:'1.3rem', cursor:'pointer', padding:'8px'
            }}
          >
            ☰
          </button>
          <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            ERGODENTAL<span style={{ color: 'var(--primary)' }}>VE</span>
          </div>
          <div style={{ width: '40px' }} /> {/* Spacer for symmetry */}
        </header>

        <main className={`page-content ${!sidebarPinned ? 'collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}


function HomeRedirect() {
  const { user, loading } = useAuth();
  const { content } = useContent();

  if (loading) return <AppLoader subtitle={content.loading_session} />;
  if (!user) return <Navigate to="/login" replace />;
  const home = user.rol ? ROL_HOME[user.rol] : '/login';
  return <Navigate to={home || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MonedaProvider>
          <ClinicaProvider>
            <ClinicaModal />
            <HashRouter>
              <Routes>
                {/* ... existing routes ... */}
                <Route path="/login"          element={<Login />} />
                <Route path="/unauthorized"   element={<Unauthorized />} />
                <Route path="/"             element={<HomeRedirect />} />

                <Route path="/dashboard" element={
                  <ProtectedLayout><RoleGuard modulo="dashboard" redirigir><Dashboard /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/agenda" element={
                  <ProtectedLayout><RoleGuard modulo="citas" redirigir><Agenda /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/pacientes" element={
                  <ProtectedLayout><RoleGuard modulo="pacientes" redirigir><Pacientes /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/citas" element={
                  <ProtectedLayout><RoleGuard modulo="citas" redirigir><Citas /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/personal" element={
                  <ProtectedLayout><RoleGuard modulo="personal" redirigir><Personal /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/odontograma" element={
                  <ProtectedLayout><RoleGuard modulo="odontograma" redirigir><Odontograma /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/inventario" element={
                  <ProtectedLayout><RoleGuard modulo="inventario" redirigir><Inventario /></RoleGuard></ProtectedLayout>
                } />

                <Route path="/finanzas" element={
                  <ProtectedLayout><RoleGuard modulo="finanzas" redirigir><Finanzas /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/laboratorios" element={
                  <ProtectedLayout><RoleGuard modulo="laboratorios" redirigir><Laboratorios /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/proveedores" element={
                  <ProtectedLayout><RoleGuard modulo="proveedores" redirigir><Proveedores /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/tasabcv" element={
                  <ProtectedLayout><RoleGuard modulo="finanzas" redirigir><TasaBCV /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/presupuestos" element={
                  <ProtectedLayout><RoleGuard modulo="presupuestos" redirigir><Presupuestos /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/recibos" element={
                  <ProtectedLayout><RoleGuard modulo="recibos" redirigir><Recibos /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/configuracion" element={
                  <ProtectedLayout><RoleGuard modulo="configuracion" redirigir><ConfiguracionClinica /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/usuarios" element={
                  <ProtectedLayout><RoleGuard modulo="usuarios" redirigir><Usuarios /></RoleGuard></ProtectedLayout>
                } />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/soporte" element={
                  <ProtectedLayout><Desarrolladores /></ProtectedLayout>
                } />
                <Route path="/manual-tecnico" element={
                  <ProtectedLayout><RoleGuard modulo="configuracion" redirigir><ManualTecnico /></RoleGuard></ProtectedLayout>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HashRouter>
          </ClinicaProvider>
        </MonedaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
