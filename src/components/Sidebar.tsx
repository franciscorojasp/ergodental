// src/components/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  { to: '/laboratorios', icon: '⚗️', label: 'Laboratorios', modulo: 'laboratorios' },
  { to: '/proveedores', icon: '🏢', label: 'Proveedores', modulo: 'proveedores' },
  // Tasa BCV — visible solo para quienes acceden a finanzas
  { to: '/tasabcv',     icon: '💱', label: 'Tasa BCV',    modulo: 'finanzas'    },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración', modulo: 'configuracion' },
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

  const sidebarWidth = isPinned ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)';

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: -260 }} 
        animate={{ 
          x: isOpen ? 0 : -260,
          width: sidebarWidth 
        }} 
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position:'fixed', top:0, left:0, bottom:0,
          background:'rgba(10,15,35,0.98)',
          borderRight:'1px solid var(--border)',
          backdropFilter:'blur(24px)',
          display:'flex', flexDirection:'column', zIndex:100,
          overflow:'hidden'
        }}
        className={`sidebar ${!isPinned ? 'mini' : ''}`}
      >
        {/* Cabecera Sidebar */}
        <div style={{ padding: isPinned ? '24px 22px 16px' : '24px 0 16px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom: isPinned ? '16px' : '0', width: '100%', padding: isPinned ? '0' : '0 20px' }}>
            <div style={{
              width:44, height:44, borderRadius:12, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              cursor: 'pointer', overflow:'hidden', background:'#fff'
            }} onClick={onTogglePinned}>
              <img src="/logo.png" alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
            {isPinned && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:'1.1rem', letterSpacing:'-0.5px', color:'#fff' }}>ERGODENTALVE</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>1.0</div>
              </motion.div>
            )}
            
            {isPinned && (
               <button className="desktop-only btn-pin" onClick={onTogglePinned} title="Colapsar menú">«</button>
            )}

            <button className="mobile-only btn-close" onClick={onClose} style={{ fontSize:'1.1rem' }}>✕</button>
          </div>

          {isPinned && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ width:'100%' }}>
              <div style={{ marginBottom: '12px' }}>
                <ClinicaBadge />
              </div>
              <CurrencyToggle />
            </motion.div>
          )}
        </div>

        {/* Navegación */}
        <nav style={{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:'6px', overflowY:'auto', overflowX:'hidden' }}>
          {navVisible.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => { if(window.innerWidth <= 768) onClose(); }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={!isPinned ? item.label : ''}
              style={{
                display:'flex', alignItems:'center', justifyContent: isPinned ? 'flex-start' : 'center',
                gap:'14px', padding:'12px', borderRadius:'12px',
                textDecoration:'none', transition:'var(--transition)',
                minHeight: '48px'
              }}
            >
              <span style={{ fontSize:'1.24rem', flexShrink:0 }}>{item.icon}</span>
              {isPinned && <motion.span initial={{opacity:0, x: -10}} animate={{opacity:1, x:0}} style={{ fontSize:'0.9rem', fontWeight:600 }}>{item.label}</motion.span>}
            </NavLink>
          ))}
        </nav>

        {/* Perfil / Footer */}
        <div style={{ padding:'16px 12px', borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>
          <button 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            style={{
              width:'100%', padding:'10px', borderRadius:'12px',
              background: 'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent: isPinned ? 'flex-start' : 'center',
              gap:'12px', cursor:'pointer', marginBottom:'16px', transition:'var(--transition)',
              color: 'var(--text-primary)'
            }}
          >
            <span style={{ fontSize:'1.2rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {isPinned && <span style={{ fontSize:'0.85rem', fontWeight:600 }}>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
          </button>

          {isPinned && user && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ marginBottom:'10px', paddingLeft:'4px' }}>
              <span className={`badge ${ROL_BADGE_CLASS[user.rol]}`} style={{ fontSize:'0.65rem', padding:'2px 8px' }}>
                {ROL_LABEL[user.rol]}
              </span>
            </motion.div>
          )}
          <div style={{
            display:'flex', alignItems:'center', justifyContent: isPinned ? 'flex-start' : 'center',
            gap:'10px', padding: isPinned ? '10px' : '4px', borderRadius:'14px', background:'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              width:36, height:36, borderRadius:'12px', flexShrink:0,
              background:'linear-gradient(135deg, var(--accent), var(--primary))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:'0.9rem', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>{user?.nombre?.charAt(0) || 'A'}</div>
            
            {isPinned && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user?.nombre}
                </div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', opacity:0.8 }}>{user?.rol}</div>
              </motion.div>
            )}
            
            {isPinned && (
              <button onClick={handleLogout} className="btn-logout" title="Cerrar sesión">⏻</button>
            )}
          </div>
          {!isPinned && (
             <button onClick={handleLogout} title="Cerrar sesión" style={{ width:'100%', background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:'1.2rem', marginTop:'12px' }}>⏻</button>
          )}
        </div>
      </motion.aside>

      <style>{`
        .nav-link { color: var(--text-secondary); border: 1px solid transparent; }
        .nav-link:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .nav-link.active { 
          background: linear-gradient(135deg, rgba(0,198,255,0.15), rgba(123,97,255,0.10));
          color: var(--primary);
          border: 1px solid rgba(0,198,255,0.25);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .btn-pin {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; cursor: pointer;
          font-size: 0.8rem; transition: all 0.2s;
        }
        .btn-pin:hover { background: var(--primary); color: #000; border-color: var(--primary); }
        .btn-logout { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; padding:4px; border-radius:6px; transition:0.2s; }
        .btn-logout:hover { color:var(--danger); background:var(--danger-dim); }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
