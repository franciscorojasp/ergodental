// src/components/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { canAccess, type Modulo } from '../permissions';
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
  const isMini = !isPinned && !isMobile;
  const showFull = !isMini;

  return (
    <>
      <div className={`mobile-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isMini ? 'collapsed' : ''}`}>
        {/* HEADER AREA: Compacted Ergonomics */}
        <div className="sidebar-header" style={{ 
          padding: isMini ? '24px 0' : '20px 24px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMini ? 'center' : 'flex-start', gap: '15px', position: 'relative' }}>
            <motion.div whileHover={{ scale: 1.05 }} className="sidebar-logo" style={{ width: (isMini || isMobile) ? '38px' : '44px', height: (isMini || isMobile) ? '38px' : '44px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            
            {showFull && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1.05rem', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                  ERGODENTALVE
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '3px' }}>
                    Professional v2.0
                  </div>
                )}
              </motion.div>
            )}

            {!isMobile && (
              <button onClick={onTogglePinned} className="sidebar-toggle-btn" style={{ top: '28px' }}>
                {isPinned ? '◀' : '▶'}
              </button>
            )}
          </div>

          {/* Header Actions: Compact for Mobile, Detailed for Desktop */}
          {showFull && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              style={{ 
                marginTop: isMobile ? '12px' : '20px', 
                display: 'flex', 
                flexDirection: isMobile ? 'row' : 'column', 
                gap: isMobile ? '8px' : '10px', 
                alignItems: isMobile ? 'center' : 'stretch'
              }}
            >
              <ClinicaBadge variant={isMobile ? 'compact' : 'default'} />
              <CurrencyToggle variant={isMobile ? 'compact' : 'default'} />
            </motion.div>
          )}
        </div>

        {/* NAVIGATION AREA: Maximum vertical space */}
        <nav className="custom-scrollbar" style={{ 
          flex: 1, 
          padding: isMini ? '10px 0' : '12px 0', 
          overflowY: 'auto' 
        }}>
          {navVisible.map((item) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={() => { if(isMobile) onClose(); }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={isMini ? item.label : ''}
              style={{ 
                justifyContent: isMini ? 'center' : 'flex-start', 
                padding: isMini ? '14px 0' : (isMobile ? '12px 16px' : '10px 24px'),
                minHeight: isMobile ? '40px' : '44px'
              }}
            >
              <span style={{ fontSize: '1.3rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              {showFull && (
                <span style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' }}>{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* FOOTER CONSOLE: Horizontal Ergonomics for All Expanded States */}
        <div className="sidebar-footer" style={{ 
          padding: isMini ? '20px 0' : '16px 20px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ 
            padding: isMini ? '0' : '10px', 
            borderRadius: isMini ? '0' : '16px',
            background: isMini ? 'transparent' : 'rgba(255,255,255,0.03)',
            border: isMini ? 'none' : '1px solid var(--border)',
            display: 'flex', 
            flexDirection: showFull ? 'row' : 'column',
            alignItems: 'center', 
            gap: '12px',
            width: '100%',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <motion.div whileHover={{ scale: 1.1 }} style={{ 
                width: isMini ? '42px' : '36px', 
                height: isMini ? '42px' : '36px', 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: '0.9rem',
                flexShrink: 0
              }}>
                {user?.nombre?.charAt(0) || 'U'}
              </motion.div>
              
              {showFull && (
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.nombre?.split(' ')[0]}
                  </div>
                  <SyncIndicator isPinned={false} />
                </div>
              )}
            </div>

            {showFull && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  onClick={toggleTheme} 
                  className="btn btn-ghost" 
                  style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
                  title="Color"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-ghost" 
                  style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', color: 'var(--danger)' }}
                  title="Salir"
                >
                  ⏻
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
