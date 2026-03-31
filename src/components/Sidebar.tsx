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

  const isMobile = window.innerWidth <= 768;
  const showFull = isPinned || isMobile;

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

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isPinned && !isMobile ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minHeight: '44px', width: '100%' }}>
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="sidebar-logo" 
              style={{ width: '44px', height: '44px', flexShrink: 0 }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            
            <AnimatePresence>
              {showFull && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
                >
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                    ERGODENTALVE
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '3px', opacity: 0.8 }}>
                    Professional v2.0
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isMobile && (
              <button
                onClick={onTogglePinned}
                className="sidebar-toggle-btn"
                style={{
                  position: 'absolute', right: '-12px', top: '38px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--bg-sidebar)', border: '1px solid var(--border-active)',
                  color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 100, boxShadow: 'var(--shadow-sm)', fontSize: '0.7rem'
                }}
              >
                {isPinned ? '◀' : '▶'}
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFull && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '15px', overflow: 'hidden' }}
              >
                <ClinicaBadge />
                <CurrencyToggle />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }} className="custom-scrollbar">
          {navVisible.map((item, idx) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={() => { if(isMobile) onClose(); }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={!showFull ? item.label : ''}
              style={{ justifyContent: showFull ? 'flex-start' : 'center' }}
            >
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                style={{ fontSize: '1.4rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {item.icon}
              </motion.span>
              <AnimatePresence>
                {showFull && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SyncIndicator isPinned={showFull} />

          <div style={{ 
            marginTop: '20px', padding: '12px', borderRadius: '18px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: showFull ? 'row' : 'column',
            alignItems: 'center', gap: '12px', width: '100%', position: 'relative'
          }}>
            <motion.div 
               whileHover={{ scale: 1.1 }}
               style={{ 
                width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: '1rem',
                boxShadow: '0 4px 15px var(--primary-glow)'
            }}>
              {user?.nombre?.charAt(0) || 'U'}
            </motion.div>
            
            <AnimatePresence>
              {showFull && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                    {user?.nombre}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>
                    {user?.rol ? ROL_LABEL[user.rol] : 'Usuario'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              whileHover={{ scale: 1.1, color: 'var(--danger)' }}
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
            >
              ⏻
            </motion.button>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: '12px', height: '44px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-light)' }}
          >
            <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <AnimatePresence>
              {showFull && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: '0.75rem', fontWeight: 800, marginLeft: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                  {theme === 'dark' ? 'MODO CLARO' : 'MODO OSCURO'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </aside>
    </>
  );
}
