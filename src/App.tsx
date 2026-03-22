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
import Desarrolladores from './pages/Desarrolladores';
import { ROL_HOME } from './permissions';

import { useState, useEffect } from 'react';

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

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-secondary)' }}>
      Cargando...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;
    
    // Si desliza hacia la derecha (>50px) y empezó cerca del borde (<50px)
    if (distance > 60 && touchStart < 60) setSidebarOpen(true);
    setTouchStart(null);
  };

  return (
    <div className="app-layout" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isPinned={sidebarPinned} 
        onTogglePinned={togglePinned}
      />
      
      {/* Modales globales */}
      <TasaModal />
      <HelpCenter />


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header - Siempre visible en móvil, o en desktop si el sidebar está cerrado */}
        <header className={`mobile-header ${!sidebarOpen ? 'force-flex' : ''}`}>
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ 
              background:'none', border:'none', color:'var(--text-primary)', 
              display:'flex', alignItems:'center', gap:'10px',
              fontSize:'1.3rem', cursor:'pointer', padding:'8px'
            }}
          >
            ☰ <span style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'1px' }}>MENÚ</span>
          </button>
          {!sidebarOpen && <div style={{ marginLeft:'12px', fontWeight:800, fontSize:'1.1rem' }}>Ergodental</div>}
        </header>

        <main className={`page-content ${!sidebarPinned ? 'collapsed' : ''} ${!sidebarOpen ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}


function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROL_HOME[user.rol]} replace />;
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
                <Route path="/login"        element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
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
                <Route path="/soporte" element={
                  <ProtectedLayout><Desarrolladores /></ProtectedLayout>
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
