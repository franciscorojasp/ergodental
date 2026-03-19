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
          style={{ zIndex: 11000, backdropFilter: 'blur(8px)' }}
          onClick={onCancel}
        >
          <motion.div 
            className="modal" 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              fontSize: '3rem', marginBottom: '15px', 
              filter: 'drop-shadow(0 0 10px rgba(0,198,255,0.3))' 
            }}>
              {icons[type]}
            </div>
            
            <h3 style={{ marginBottom: '10px', fontSize: '1.4rem' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', lineHeight: 1.6 }}>
              {message}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={onCancel}>
                {cancelText}
              </button>
              <button 
                className="btn" 
                style={{ 
                  background: colors[type], 
                  color: '#fff',
                  boxShadow: `0 8px 20px ${colors[type]}44`
                }} 
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
