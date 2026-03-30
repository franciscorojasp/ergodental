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
          style={{ zIndex: 11000 }}
          onClick={onCancel}
        >
          <motion.div 
            className="modal" 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-body" style={{ padding: '40px 32px' }}>
              <div style={{ 
                fontSize: '3.5rem', marginBottom: '20px', 
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' 
              }}>
                {icons[type]}
              </div>
              
              <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>{title}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6, fontSize: '1rem', fontWeight: 500 }}>
                {message}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>
                  {cancelText}
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    background: colors[type], 
                    color: '#fff',
                    boxShadow: `0 8px 25px ${colors[type]}44`,
                    flex: 1
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
