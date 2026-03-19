// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MonedaProvider } from './contexts/MonedaContext';
import { ClinicaProvider } from './contexts/ClinicaContext';
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
import { ROL_HOME } from './permissions';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-secondary)' }}>
      Cargando...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      {/* Modales globales */}
      <TasaModal />
      <HelpCenter />
      <main className="page-content">{children}</main>
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
      <MonedaProvider>
        <ClinicaProvider>
          <ClinicaModal />
          <BrowserRouter>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login"        element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/"             element={<HomeRedirect />} />

              {/* Rutas protegidas */}
              <Route path="/dashboard" element={
                <ProtectedLayout><RoleGuard modulo="dashboard" redirigir><Dashboard /></RoleGuard></ProtectedLayout>
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

              {/* ── ADMIN only ── */}
              <Route path="/finanzas" element={
                <ProtectedLayout><RoleGuard modulo="finanzas" redirigir><Finanzas /></RoleGuard></ProtectedLayout>
              } />
              <Route path="/proveedores" element={
                <ProtectedLayout><RoleGuard modulo="proveedores" redirigir><Proveedores /></RoleGuard></ProtectedLayout>
              } />
              <Route path="/tasabcv" element={
                <ProtectedLayout><RoleGuard modulo="finanzas" redirigir><TasaBCV /></RoleGuard></ProtectedLayout>
              } />
              <Route path="/configuracion" element={
                <ProtectedLayout><RoleGuard modulo="configuracion" redirigir><ConfiguracionClinica /></RoleGuard></ProtectedLayout>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ClinicaProvider>
      </MonedaProvider>
    </AuthProvider>
  );
}
