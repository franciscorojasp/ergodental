import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger';
}

export default function ConfirmDialog({
  isOpen, title, message, onConfirm, onCancel,
  confirmText = 'Sí, continuar', cancelText = 'Cancelar',
  type = 'warning'
}: ConfirmDialogProps) {

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);
  
  const colors = {
    warning: 'var(--primary)',
    info: 'var(--accent)',
    danger: 'var(--danger)'
  };

  const icons = {
    warning: '⚠️',
    info: 'ℹ️',
    danger: '🛑'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{ zIndex: 11000, backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}
          onClick={onCancel}
        >
          <motion.div 
            className="modal" 
            initial={{ scale: 0.9, opacity: 0, y: 40 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ maxWidth: '440px', padding: 0, overflow: 'hidden', textAlign: 'center', background: 'rgba(10, 15, 30, 0.95)', border: `1px solid ${colors[type]}44` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-body" style={{ padding: '48px 40px' }}>
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                style={{ 
                  fontSize: '4.5rem', marginBottom: '24px', 
                  filter: `drop-shadow(0 15px 30px ${colors[type]}44)` 
                }}
              >
                {icons[type]}
              </motion.div>
              
              <h3 style={{ marginBottom: '16px', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>{title}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.7, fontSize: '1.05rem', fontWeight: 500 }}>
                {message}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={onCancel} 
                  style={{ height: '54px', borderRadius: '16px', fontWeight: 800, fontSize: '0.95rem' }}
                >
                  {cancelText}
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    background: colors[type], 
                    color: type === 'warning' ? '#000' : '#fff',
                    boxShadow: `0 12px 30px ${colors[type]}66`,
                    height: '54px', borderRadius: '16px', fontWeight: 900, fontSize: '0.95rem'
                  }} 
                  onClick={onConfirm}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
