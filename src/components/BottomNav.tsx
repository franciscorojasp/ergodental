import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { canAccess } from '../permissions';

interface BottomNavProps {
  onOpenSidebar: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Inicio', modulo: 'dashboard' as const },
    { to: '/pacientes', icon: '🦷', label: 'Pacientes', modulo: 'pacientes' as const },
    { to: '/agenda', icon: '📆', label: 'Agenda', modulo: 'citas' as const },
    { to: '/odontograma', icon: '🗺️', label: 'Odonto', modulo: 'odontograma' as const },
  ].filter(item => canAccess(user?.rol, item.modulo));

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación Móvil Rápida">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <motion.div
              whileTap={{ scale: 0.88 }}
              className="bottom-nav-icon-wrap"
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              {isActive && (
                <motion.span
                  layoutId="bottomNavDot"
                  className="bottom-nav-dot"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.div>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}

      {/* Botón "Más" para abrir el sidebar completo en móvil */}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="bottom-nav-item bottom-nav-menu-btn"
        aria-label="Abrir Menú Principal"
      >
        <motion.div whileTap={{ scale: 0.88 }} className="bottom-nav-icon-wrap">
          <span className="bottom-nav-icon">☰</span>
        </motion.div>
        <span className="bottom-nav-label">Menú</span>
      </button>
    </nav>
  );
};

export default BottomNav;
