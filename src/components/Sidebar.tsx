// src/components/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { canAccess, ROL_LABEL, type Modulo } from '../permissions';
import CurrencyToggle from './CurrencyToggle';
import ClinicaBadge from './ClinicaBadge';
import SyncIndicator from './SyncIndicator';

const NAV: { to: string; icon: string; label: string; modulo: Modulo }[] = [
  { to: '/dashboard',   icon: '📊', label: 'Dashboard',   modulo: 'dashboard'   },
  { to: '/agenda',      icon: '📆', label: 'Agenda Visual',modulo: 'citas'       },
  { to: '/pacientes',   icon: '🦷', label: 'Pacientes',   modulo: 'pacientes'   },
  { to: '/citas',       icon: '📅', label: 'Citas',       modulo: 'citas'       },
  { to: '/personal',    icon: '👨‍⚕️', label: 'Personal',    modulo: 'personal'    },
  { to: '/usuarios',    icon: '🔐', label: 'Gestión Cuentas',modulo: 'usuarios'    },
  { to: '/odontograma', icon: '🗺️', label: 'Odontograma', modulo: 'odontograma' },
  { to: '/finanzas',    icon: '💰', label: 'Finanzas',    modulo: 'finanzas'    },
  { to: '/presupuestos', icon: '🛠️', label: 'Presupuestos',modulo: 'presupuestos' },
  { to: '/recibos',      icon: '🧾', label: 'Recibos',      modulo: 'recibos'      },
  { to: '/inventario',  icon: '📦', label: 'Inventario',  modulo: 'inventario'  },
  { to: '/laboratorios', icon: '⚗️', label: 'Laboratorios', modulo: 'laboratorios' },
  { to: '/proveedores', icon: '🏢', label: 'Proveedores', modulo: 'proveedores' },
  { to: '/tasabcv',     icon: '💱', label: 'Tasa BCV',    modulo: 'finanzas'    },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración', modulo: 'configuracion' },
  { to: '/soporte',      icon: '🚀', label: 'Desarrolladores', modulo: 'dashboard' },
];

interface SidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePinned: () => void;
}

export default function Sidebar({ isOpen, onClose, isPinned, onTogglePinned }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navVisible = NAV.filter(item => canAccess(user?.rol, item.modulo));
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-overlay active" 
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isPinned ? 'collapsed' : ''}`}>
        {/* Header Arquitectónico Consolidado */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="sidebar-logo"
              style={{ width: isPinned ? '44px' : '40px', height: isPinned ? '44px' : '40px' }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            
            {isPinned && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.3px', color: 'var(--text-primary)', lineHeight: 1 }}>
                  ERGODENTALVE
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                  Professional v2.0
                </div>
              </motion.div>
            )}

            {/* Toggle Button: Alineación Estructural */}
            {window.innerWidth > 768 && (
              <button
                onClick={onTogglePinned}
                style={{
                  position: 'absolute',
                  right: '-12px',
                  top: '38px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-active)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 100,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  fontSize: '0.7rem',
                  padding: 0
                }}
              >
                {isPinned ? '◀' : '▶'}
              </button>
            )}
          </div>

          <AnimatePresence>
            {isPinned && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: '20px' }}>
                <ClinicaBadge />
                <div style={{ marginTop: '12px' }}>
                  <CurrencyToggle />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navegación Refinada (Estilos controlados por CSS) */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }} className="custom-scrollbar">
          {navVisible.map((item, idx) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={() => { if(window.innerWidth <= 768) onClose(); }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={!isPinned ? item.label : ''}
            >
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                style={{ fontSize: '1.4rem', flexShrink: 0 }}
              >
                {item.icon}
              </motion.span>
              {isPinned && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: '0.9rem', fontWeight: 600 }}
                >
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer: Consola Quirúrgica Integrada */}
        <div className="sidebar-footer">
          <SyncIndicator isPinned={isPinned} />

          <div style={{ 
            marginTop: '16px',
            padding: '10px',
            borderRadius: '16px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: isPinned ? 'row' : 'column',
            alignItems: 'center',
            gap: '10px',
            position: 'relative'
          }}>
            <div style={{ 
              width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: '#fff', fontSize: '0.9rem',
              boxShadow: '0 4px 10px var(--primary-glow)'
            }}>
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            
            {isPinned && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                  {user?.nombre}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>
                  {user?.rol ? ROL_LABEL[user.rol] : 'Usuario'}
                </div>
              </div>
            )}

            <motion.button 
              whileHover={{ scale: 1.1, color: 'var(--danger)' }}
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px' }}
              title="Cerrar Sesión"
            >
              ⏻
            </motion.button>
          </div>

          <button 
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ 
              width: '100%', 
              marginTop: '10px', 
              height: '40px', 
              padding: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              borderRadius: '12px'
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
            {isPinned && <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '8px' }}>{theme === 'dark' ? 'MODO CLARO' : 'MODO OSCURO'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
