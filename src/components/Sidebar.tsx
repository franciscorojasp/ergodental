// src/components/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { canAccess, ROL_LABEL, ROL_BADGE_CLASS, type Modulo } from '../permissions';
import CurrencyToggle from './CurrencyToggle';
import ClinicaBadge from './ClinicaBadge';

const NAV: { to: string; icon: string; label: string; modulo: Modulo }[] = [
  { to: '/dashboard',   icon: '📊', label: 'Dashboard',   modulo: 'dashboard'   },
  { to: '/agenda',      icon: '📆', label: 'Agenda Visual',modulo: 'citas'       },
  { to: '/pacientes',   icon: '🦷', label: 'Pacientes',   modulo: 'pacientes'   },
  { to: '/citas',       icon: '📅', label: 'Citas',       modulo: 'citas'       },
  { to: '/personal',    icon: '👨‍⚕️', label: 'Personal',    modulo: 'personal'    },
  { to: '/odontograma', icon: '🗺️', label: 'Odontograma', modulo: 'odontograma' },
  { to: '/finanzas',    icon: '💰', label: 'Finanzas',    modulo: 'finanzas'    },
  { to: '/presupuestos', icon: '🛠️', label: 'Presupuestos',modulo: 'presupuestos' },
  { to: '/recibos',      icon: '🧾', label: 'Recibos',      modulo: 'recibos'      },
  { to: '/inventario',  icon: '📦', label: 'Inventario',  modulo: 'inventario'  },
  { to: '/proveedores', icon: '🏢', label: 'Proveedores', modulo: 'proveedores' },
  // Tasa BCV — visible solo para quienes acceden a finanzas
  { to: '/tasabcv',     icon: '💱', label: 'Tasa BCV',    modulo: 'finanzas'    },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración', modulo: 'configuracion' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navVisible = NAV.filter(item => canAccess(user?.rol, item.modulo));

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Overlay para móvil */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: -260 }} 
        animate={{ x: isOpen ? 0 : -260 }} 
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position:'fixed', top:0, left:0, bottom:0,
          width:'var(--sidebar-w)',
          background:'rgba(10,15,30,0.95)',
          borderRight:'1px solid var(--border)',
          backdropFilter:'blur(20px)',
          display:'flex', flexDirection:'column', zIndex:100,
        }}
        className="sidebar"
      >
        {/* Logo */}
        <div style={{ padding:'24px 22px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <div style={{
              width:40, height:40, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg, var(--primary), var(--accent))',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem',
            }}>🦷</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:'1rem', letterSpacing:'-0.3px' }}>Ergodental</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:500 }}>Sistema de Gestión</div>
            </div>
            {/* Botón cerrar */}
            <button className="btn-close" onClick={onClose} style={{ fontSize:'1.1rem' }}>✕</button>
          </div>

          {/* Selector de Clínica */}
          <div style={{ marginBottom: '12px' }}>
            <ClinicaBadge />
          </div>

          {/* Widget tasa BCV + toggle USD/BS */}
          <CurrencyToggle />
        </div>

        {/* Nav filtrado por rol */}
        <nav style={{ flex:1, padding:'12px 12px', display:'flex', flexDirection:'column', gap:'3px', overflowY:'auto' }}>
          {navVisible.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => { if(window.innerWidth <= 768) onClose(); }}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:'12px',
                padding:'10px 14px', borderRadius:'var(--radius-sm)',
                textDecoration:'none', fontSize:'0.88rem', fontWeight:600,
                transition:'var(--transition)',
                background: isActive ? 'linear-gradient(135deg, rgba(0,198,255,0.15), rgba(123,97,255,0.10))' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(0,198,255,0.2)' : '1px solid transparent',
              })}
            >
              <span style={{ fontSize:'1.05rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Info de usuario */}
        <div style={{ padding:'14px 12px', borderTop:'1px solid var(--border)' }}>
          {user && (
            <div style={{ marginBottom:'6px', paddingLeft:'2px' }}>
              <span className={`badge ${ROL_BADGE_CLASS[user.rol]}`} style={{ fontSize:'0.68rem' }}>
                {ROL_LABEL[user.rol]}
              </span>
            </div>
          )}
          <div style={{
            display:'flex', alignItems:'center', gap:'10px',
            padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'var(--bg-card)',
          }}>
            <div style={{
              width:34, height:34, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg, var(--accent), var(--primary))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:'0.82rem',
            }}>{user?.nombre?.charAt(0) || 'A'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:'0.8rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.nombre}
              </div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>{user?.email}</div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1rem', padding:'4px', borderRadius:'4px' }}>
              ⏻
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
