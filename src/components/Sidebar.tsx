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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999 }}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isPinned ? 'collapsed' : ''}`}>
        {/* Header de Lujo con Toggle Retráctil */}
        <div style={{ padding: isPinned ? '32px 24px' : '32px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: isPinned ? '24px' : '0', justifyContent: isPinned ? 'flex-start' : 'center' }}>
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="sidebar-logo"
              style={{ cursor: 'default', width: isPinned ? '50px' : '40px', height: isPinned ? '50px' : '40px' }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            
            {isPinned && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>ERGODENTALVE</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.8 }}>v2.0 Pro</div>
              </motion.div>
            )}

            {/* Botón de Retracción Quirúrgico */}
            {window.innerWidth > 768 && (
              <motion.button
                whileHover={{ scale: 1.1, background: 'var(--primary-dim)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onTogglePinned}
                style={{
                  position: 'absolute',
                  right: isPinned ? '-12px' : '-12px',
                  top: '50px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-active)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 100,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  fontSize: '0.7rem'
                }}
              >
                {isPinned ? '◀' : '▶'}
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {isPinned && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginBottom: '16px' }}>
                  <ClinicaBadge />
                </div>
                <CurrencyToggle />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navegación Refinada con Tooltips */}
        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {navVisible.map((item, idx) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={() => { if(window.innerWidth <= 768) onClose(); }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={!isPinned ? item.label : ''}
              style={{ 
                justifyContent: isPinned ? 'flex-start' : 'center',
                padding: isPinned ? '14px 20px' : '14px 0',
                margin: isPinned ? '4px 12px' : '4px 8px'
              }}
            >
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                style={{ fontSize: '1.4rem', flexShrink: 0 }}
              >
                {item.icon}
              </motion.span>
              {isPinned && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: '0.95rem', fontWeight: 600 }}
                >
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer / User Profile High-End */}
        <div style={{ padding: '24px 16px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
          <SyncIndicator isPinned={isPinned} />

          <div style={{ 
            marginTop: '16px',
            padding: isPinned ? '12px' : '6px',
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ 
              width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: '#fff', fontSize: '1rem',
              boxShadow: '0 4px 12px var(--primary-glow)'
            }}>
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            
            {isPinned && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                  {user?.nombre}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {user?.rol ? ROL_LABEL[user.rol] : 'Usuario'}
                </div>
              </div>
            )}

            {isPinned && (
              <motion.button 
                whileHover={{ scale: 1.1, color: 'var(--danger)' }}
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ⏻
              </motion.button>
            )}
          </div>

          <button 
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: '12px', minHeight: '44px', padding: '0 12px', justifyContent: isPinned ? 'flex-start' : 'center' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
            {isPinned && <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: '10px' }}>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
